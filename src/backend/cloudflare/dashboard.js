import { HTTPException } from "hono/http-exception";
import { bucketForDuration } from "../../analytics/ranges.js";
import { metrics } from "./metrics.js";

const overview = metrics.requests.dataset;
const http = metrics.performance.dataset;
const buckets = {
  datetimeMinute: 60_000,
  datetimeFiveMinutes: 300_000,
  datetimeFifteenMinutes: 900_000,
  datetimeHour: 3_600_000,
  date: 86_400_000,
};

const sum = (fields) => `sum { ${fields} }`;
const totalFields = "requests bytes visits pageViews cachedRequests cachedBytes";
const encryptedFilter = 'clientSSLProtocol_notin: ["none", ""]';
const statusFilter = (group) => `edgeResponseStatus_geq: ${group * 100}, edgeResponseStatus_lt: ${(group + 1) * 100}`;
const breakdown = (dataset, field, filter) => ({
  dataset,
  limit: 20,
  order: ["count_DESC"],
  filter,
  fields: `count dimensions { ${field} }`,
  format: (rows) => rows.map(({ count, dimensions }) => ({ label: dimensions[field], value: count })),
});
const totals = (dataset, fields) => ({
  dataset,
  fields: sum(fields),
  format: ([row]) => row?.sum ?? Object.fromEntries(fields.split(" ").map((field) => [field, 0])),
});
const trafficTotals = { ...totals(overview, totalFields), compare: true };
const encryptedTotals = { ...totals(overview, "requests bytes"), filter: encryptedFilter };

const rankings = {
  devices: "clientDeviceType",
  paths: "clientRequestPath",
  hosts: "clientRequestHTTPHost",
  ips: "clientIP",
  browsers: "userAgentBrowser",
  operatingSystems: "userAgentOS",
  userAgents: "userAgent",
  cacheStatuses: "cacheStatus",
  originStatuses: "originResponseStatus",
  methods: "clientRequestHTTPMethodName",
};

function requestRanking(field) {
  return {
    dataset: overview,
    limit: 20,
    order: ["sum_requests_DESC"],
    fields: `${sum("requests")} dimensions { ${field} }`,
    format: (rows) => rows.map(({ dimensions, sum }) => ({ label: dimensions[field], value: sum.requests })),
  };
}

function select(dataset, { fields, limit = 1, order, filter }, pageSize) {
  const orderBy = order ? `, orderBy: [${order.join(", ")}]` : "";
  const extra = filter ? `, ${filter}` : "";
  return `${dataset}(limit: ${Math.min(limit, pageSize)}${orderBy},
    filter: { datetime_geq: $from, datetime_lt: $to${extra} }) { ${fields} }`;
}

function actionCounts(metric) {
  return {
    dataset: metric.dataset,
    async query(run, { pageSize }) {
      const actions = select(metric.dataset, metric, pageSize);
      const total = select(metric.dataset, { fields: "count", filter: metric.filter }, pageSize);
      const { rows, aggregate } = await run(`rows: ${actions} aggregate: ${total}`);
      return { count: aggregate?.[0]?.count ?? 0, actions: metric.format(rows ?? []) };
    },
  };
}

const datasets = {
  totals: trafficTotals,
  countries: metrics.countries,
  security: actionCounts(metrics.security),
  securityActions: actionCounts(breakdown(http, "securityAction", 'securityAction_neq: ""')),
  dns: metrics.dns,
  endpoints: metrics["api-requests"],
  infrastructure: metrics.infrastructure,
  origin: {
    dataset: overview,
    fields: "avg { originResponseDurationMs }",
    format: ([row]) => row?.avg?.originResponseDurationMs ?? null,
  },
  edge: {
    dataset: http,
    fields: "avg { edgeTimeToFirstByteMs }",
    format: ([row]) => row?.avg?.edgeTimeToFirstByteMs ?? null,
  },
};

const overviewRankings = {
  versions: requestRanking("clientRequestHTTPProtocol"),
  tls: requestRanking("clientSSLProtocol"),
  contentTypes: requestRanking("edgeResponseContentTypeName"),
  tlsKeyExchangeGroups: requestRanking("clientTLSKeyExchangeGroup"),
};
const requestRankings = Object.fromEntries(Object.entries(rankings).map(([name, field]) => [
  name, breakdown(http, field, 'requestSource: "eyeball"'),
]));

const products = {
  workers: metrics.workers,
  pages: totals("pagesFunctionsInvocationsAdaptiveGroups", "requests errors"),
  d1: totals("d1AnalyticsAdaptiveGroups", "readQueries writeQueries rowsRead rowsWritten"),
  r2: totals("r2OperationsAdaptiveGroups", "requests responseBytes"),
  turnstile: breakdown("turnstileAdaptiveGroups", "eventType"),
};

function queryWindow(range, settings, now) {
  if (!settings?.enabled) {
    throw new HTTPException(403, { message: "当前套餐或 API Token 无法读取此数据。" });
  }
  const retention = settings.notOlderThan * 1000 - 5_000;
  const maximum = Math.min(settings.maxDuration * 1000, retention);
  if (!(maximum > 0) || !Number.isFinite(maximum)) {
    throw new HTTPException(422, { message: "Cloudflare 未提供此数据的可查询时间范围。" });
  }
  const duration = Math.min(range.duration ?? maximum, maximum);
  const from = new Date(now - duration).toISOString();
  return {
    from,
    to: new Date(now).toISOString(),
    limited: range.duration > maximum,
    pageSize: settings.maxPageSize,
    bucket: bucketForDuration(duration),
    previous: duration * 2 <= retention ? { from: new Date(now - 2 * duration).toISOString(), to: from } : null,
  };
}

function statusSelection(groups, pageSize) {
  return groups.map((group) => `status${group}: ${select(overview, {
    fields: sum("requests"),
    filter: statusFilter(group),
  }, pageSize)}`).join("\n");
}

const statuses = {
  dataset: overview,
  async compare(run, { pageSize }) {
    const data = await run(statusSelection([4, 5], pageSize));
    return [4, 5].map((group) => data["status" + group]?.[0]?.sum.requests ?? 0);
  },
  async query(run, { pageSize }) {
    const groups = statusSelection([2, 3, 4, 5], pageSize);
    const statusCodes = select(overview, metrics["status-codes"], pageSize);
    const { status2, status3, status4, status5, rows } = await run(`${groups}\nrows: ${statusCodes}`);
    const totals = [status2, status3, status4, status5].map((rows) => rows?.[0]?.sum.requests ?? 0);
    return { totals, codes: metrics["status-codes"].format(rows ?? []) };
  },
};

function trendWindow({ from, to, bucket, pageSize }) {
  const start = Date.parse(from);
  const end = Date.parse(to);
  const count = (step) => Math.ceil(end / step) - Math.floor(start / step);
  const startIndex = Object.keys(buckets).indexOf(bucket);
  const interval = Object.entries(buckets).slice(startIndex).find(([, step]) => count(step) <= Math.min(400, pageSize));
  if (!interval) throw new HTTPException(422, { message: "此时间范围的趋势超过 Cloudflare 查询上限。" });
  const [dimension, step] = interval;

  return {
    select(fields, filter) {
      return select(overview, {
        limit: count(step),
        order: [dimension + "_ASC"],
        fields: `dimensions { ${dimension} } ${sum(fields)}`,
        filter,
      }, pageSize);
    },
    format(rows, fields) {
      const points = new Map((rows ?? []).map(({ dimensions, sum }) => [Date.parse(dimensions[dimension]), sum]));
      const zero = Object.fromEntries(fields.split(" ").map((field) => [field, 0]));
      const data = [];
      for (let time = Math.floor(start / step) * step; time < end; time += step) {
        data.push({ time, ...zero, ...points.get(time) });
      }
      return { data, bucket: dimension };
    },
  };
}

const trend = {
  dataset: overview,
  async query(run, window) {
    const series = trendWindow(window);
    const { rows } = await run("rows: " + series.select(totalFields));
    const { data, bucket } = series.format(rows, totalFields);
    return {
      bucket,
      data: data.map((point) => ({ ...point, hitRate: point.requests ? 100 * point.cachedRequests / point.requests : null })),
    };
  },
};

const encrypted = {
  ...encryptedTotals,
  compare: true,
  async query(run, window) {
    const series = trendWindow(window);
    const aggregate = select(overview, encryptedTotals, window.pageSize);
    const { total, rows } = await run(`total: ${aggregate} rows: ${series.select("requests bytes", encryptedFilter)}`);
    return { ...encryptedTotals.format(total ?? []), trend: series.format(rows, "requests bytes") };
  },
};

const errorTrend = {
  dataset: overview,
  async query(run, window) {
    const series = trendWindow(window);
    const { client, server } = await run(`client: ${series.select("requests", statusFilter(4))}
      server: ${series.select("requests", statusFilter(5))}`);
    return { client: series.format(client, "requests"), server: series.format(server, "requests") };
  },
};

async function panelResult(load) {
  try {
    return await load();
  } catch (error) {
    if (!(error instanceof HTTPException)) throw error;
    return { error: error.message };
  }
}

function loadMetric(metric, getWindow, run) {
  return panelResult(async () => {
    const window = getWindow(metric.dataset);
    const current = (fields) => run(fields, window);
    const aggregate = (query) => query("rows: " + select(metric.dataset, metric, window.pageSize))
      .then(({ rows }) => metric.format(rows ?? []));
    const dataRequest = metric.query ? metric.query(current, window) : aggregate(current);
    const previousRequest = window.previous && metric.compare && panelResult(async () => {
      const previous = (fields) => run(fields, window.previous);
      const data = metric.compare === true ? await aggregate(previous) : await metric.compare(previous, window);
      return { ...window.previous, data };
    });
    const [data, previous] = await Promise.all([dataRequest, previousRequest]);
    return { ...panelWindow(window), data, ...(metric.compare ? { previous: previous?.error ? null : previous || null } : {}) };
  });
}

function panelWindow({ from, to, limited }) {
  return { from, to, limited };
}

async function loadRankings(rankings, getWindow, run) {
  const entries = Object.entries(rankings);
  const dataset = entries[0][1].dataset;
  try {
    const window = getWindow(dataset);
    const fields = entries.map(([key, metric]) => `${key}: ${select(dataset, metric, window.pageSize)}`).join("\n");
    const result = await run(fields, window);
    return entries.map(([key, metric]) => [key, { ...panelWindow(window), data: metric.format(result[key] ?? []) }]);
  } catch (error) {
    if (!(error instanceof HTTPException)) throw error;
    if (error.status !== 403 && error.status !== 502) {
      return entries.map(([key]) => [key, { error: error.message }]);
    }
    // A denied dimension can reject the whole GraphQL batch.
    return Promise.all(entries.map(async ([key, metric]) => [key, await loadMetric(metric, getWindow, run)]));
  }
}

export async function loadDashboard(cloudflare, scope, id, range) {
  const panels = { ...datasets, ...(scope === "accounts" ? products : {}), statuses, trend, encrypted, errorTrend };
  const names = [...new Set(Object.values(panels).map(({ dataset }) => dataset))];
  const fields = names.map((name) => `${name} { enabled maxDuration notOlderThan maxPageSize }`).join("\n");
  const { settings } = await cloudflare.queryScope(scope, id, `settings { ${fields} }`);
  const now = Date.now();
  const getWindow = (dataset) => queryWindow(range, settings?.[dataset], now);
  const run = (fields, { from, to }) => cloudflare.queryScope(scope, id, fields, { from, to });
  const [base, overviewBreakdowns, requestBreakdowns] = await Promise.all([
    Promise.all(Object.entries(panels).map(async ([key, metric]) => [key, await loadMetric(metric, getWindow, run)])),
    loadRankings(overviewRankings, getWindow, run),
    loadRankings(requestRankings, getWindow, run),
  ]);
  return { panels: Object.fromEntries([...base, ...overviewBreakdowns, ...requestBreakdowns]) };
}
