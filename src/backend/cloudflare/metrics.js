const http = "httpRequestsAdaptiveGroups";
const httpOverview = "httpRequestsOverviewAdaptiveGroups";
const compactCounts = (rows, field, value = (row) => row.count) =>
  rows.map((row) => ({ label: row.dimensions[field], value: value(row) }));

const breakdown = (dataset, field, limit = 12) => ({
  dataset,
  limit,
  order: ["count_DESC"],
  fields: `count dimensions { ${field} }`,
  format: (rows) => compactCounts(rows, field),
});

export const metrics = {
  requests: {
    dataset: httpOverview,
    fields: "sum { requests bytes }",
    format: ([row]) => ({ requests: row?.sum.requests ?? 0, bytes: row?.sum.bytes ?? 0 }),
  },
  visits: {
    dataset: httpOverview,
    fields: "sum { visits pageViews }",
    format: ([row]) => ({ visits: row?.sum.visits ?? 0, pageViews: row?.sum.pageViews ?? 0 }),
  },
  trend: {
    dataset: httpOverview,
    series: true,
    fields: (bucket) => `dimensions { ${bucket} } sum { requests }`,
    format: (rows, bucket) => compactCounts(rows, bucket, (row) => row.sum.requests),
  },
  countries: {
    dataset: httpOverview,
    limit: 12,
    order: ["sum_requests_DESC"],
    fields: "dimensions { clientCountryName } sum { requests }",
    format: (rows) => compactCounts(rows, "clientCountryName", (row) => row.sum.requests),
  },
  "status-codes": {
    dataset: httpOverview,
    limit: 100,
    order: ["sum_requests_DESC"],
    fields: "dimensions { edgeResponseStatus } sum { requests }",
    format: (rows) => compactCounts(rows, "edgeResponseStatus", (row) => row.sum.requests),
  },
  "api-requests": {
    ...breakdown(http, "apiGatewayMatchedEndpoint"),
    filter: 'apiGatewayMatchedEndpoint_neq: ""',
  },
  cache: {
    dataset: httpOverview,
    fields: "sum { requests cachedRequests bytes cachedBytes }",
    format: ([row]) => {
      const { requests = 0, cachedRequests = 0, bytes = 0, cachedBytes = 0 } = row?.sum ?? {};
      return {
        hitRate: requests ? (100 * cachedRequests) / requests : null,
        cachedRequests,
        cachedBytes,
        bytes,
      };
    },
  },
  security: breakdown("firewallEventsAdaptiveGroups", "action", 20),
  dns: breakdown("dnsAnalyticsAdaptiveGroups", "queryType", 20),
  workers: {
    scope: "accounts",
    dataset: "workersInvocationsAdaptive",
    limit: 100,
    order: ["sum_requests_DESC"],
    fields: "dimensions { scriptName } sum { requests errors }",
    format: (rows) => rows.map(({ dimensions, sum }) => ({
      label: dimensions.scriptName,
      value: sum.requests,
      errors: sum.errors,
    })),
  },
  performance: {
    dataset: http,
    fields: "avg { edgeTimeToFirstByteMs originResponseDurationMs }",
    format: ([row]) => ({
      edge: row?.avg.edgeTimeToFirstByteMs ?? null,
      origin: row?.avg.originResponseDurationMs ?? null,
    }),
  },
  infrastructure: breakdown(http, "coloCode"),
};
