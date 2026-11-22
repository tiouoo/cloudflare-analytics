import { HTTPException } from "hono/http-exception";
import { bucketForDuration } from "../../analytics/ranges.js";
import { metrics } from "./metrics.js";

const overview = metrics.requests.dataset;
const http = metrics.performance.dataset;
const buckets = {
  datetimeMinute: 60_000,
  datetimeFiveMinutes: 300_000,
  datetimeHour: 3_600_000,
  date: 86_400_000,
};

const sum = (fields) => `sum { ${fields} }`;
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
  totals: totals(overview, "requests bytes visits pageViews cachedRequests cachedBytes"),
  versions: {
    dataset: overview,
    limit: 20,
    order: ["sum_requests_DESC"],
    fields: `${sum("requests")} dimensions { clientRequestHTTPProtocol }`,
    format: (rows) => rows.map(({ dimensions, sum }) => ({
      label: dimensions.clientRequestHTTPProtocol, value: sum.requests,
    })),
  },
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
  const maximum = Math.min(settings.maxDuration, settings.notOlderThan) * 1000;
  if (maximum <= 5_000 || !Number.isFinite(maximum)) {
    throw new HTTPException(422, { message: "Cloudflare 未提供此数据的可查询时间范围。" });
  }
  // Leave time for the query to reach Cloudflare before the retention cutoff.
  const duration = Math.min(range.duration ?? maximum, maximum - 5_000);
  return {
    from: new Date(now - duration).toISOString(),
    to: new Date(now).toISOString(),
    limited: range.duration > maximum,
    pageSize: settings.maxPageSize,
    bucket: bucketForDuration(duration),
  };
}

const statuses = {
  dataset: overview,
  async query(run, { pageSize }) {
    const groups = [2, 3, 4, 5].map((group) => `status${group}: ${select(overview, {
      fields: sum("requests"),
      filter: `edgeResponseStatus_geq: ${group * 100}, edgeResponseStatus_lt: ${(group + 1) * 100}`,
    }, pageSize)}`);
    const statusCodes = select(overview, metrics["status-codes"], pageSize);
    const { status2, status3, status4, status5, rows } = await run([...groups, "rows: " + statusCodes].join("\n"));
    const totals = [status2, status3, status4, status5].map((rows) => rows?.[0]?.sum.requests ?? 0);
    return { totals, codes: metrics["status-codes"].format(rows ?? []) };
  },
};

const trend = {
  dataset: overview,
  async query(run, { from, to, bucket, pageSize }) {
    const start = Date.parse(from);
    const end = Date.parse(to);
    const count = (step) => Math.ceil(end / step) - Math.floor(start / step);
    const startIndex = Object.keys(buckets).indexOf(bucket);
    const interval = Object.entries(buckets).slice(startIndex).find(([, step]) => count(step) <= Math.min(400, pageSize));
    if (!interval) throw new HTTPException(422, { message: "此时间范围的趋势超过 Cloudflare 查询上限。" });
    const [dimension, step] = interval;
    const query = select(overview, {
      limit: count(step),
      order: [dimension + "_ASC"],
      fields: `dimensions { ${dimension} } ${sum("requests bytes cachedRequests")}`,
    }, pageSize);
    const { rows } = await run("rows: " + query);
    const points = new Map((rows ?? []).map(({ dimensions, sum }) => [Date.parse(dimensions[dimension]), sum]));
    const data = [];
    for (let time = Math.floor(start / step) * step; time < end; time += step) {
      const { requests = 0, bytes = 0, cachedRequests = 0 } = points.get(time) ?? {};
      data.push({ time, requests, bytes, hitRate: requests ? 100 * cachedRequests / requests : null });
    }
    return { data, bucket: dimension };
  },
};

export async function loadDashboard(cloudflare, scope, id, range) {
  const metrics = { ...datasets, ...(scope === "accounts" ? products : {}), statuses, trend };
  const names = [...new Set(Object.values(metrics).map(({ dataset }) => dataset))];
  const fields = names.map((name) => `${name} { enabled maxDuration notOlderThan maxPageSize }`).join("\n");
  const { settings } = await cloudflare.queryScope(scope, id, `settings { ${fields} }`);
  const now = Date.now();
  const panels = await Promise.all(Object.entries(metrics).map(async ([name, metric]) => {
    try {
      const { from, to, ...window } = queryWindow(range, settings?.[metric.dataset], now);
      const run = (fields) => cloudflare.queryScope(scope, id, fields, { from, to });
      const data = metric.query
        ? await metric.query(run, { from, to, ...window })
        : metric.format((await run("rows: " + select(metric.dataset, metric, window.pageSize))).rows ?? []);
      return [name, { data, from, to, limited: window.limited }];
    } catch (error) {
      if (!(error instanceof HTTPException)) throw error;
      return [name, { error: error.message }];
    }
  }));
  return { panels: Object.fromEntries(panels) };
}
