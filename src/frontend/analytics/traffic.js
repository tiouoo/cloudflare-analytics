const rate = (value, total) => total > 0 && value != null ? 100 * value / total : null;

export const overviewCards = [
  { key: "requests", label: "HTTP 请求数", target: "requests" },
  { key: "visits", label: "访问次数", target: "audience" },
  { key: "hitRate", label: "缓存命中率", unit: "%", target: "cache" },
  { key: "bytes", label: "HTTP 响应流量", unit: "bytes", target: "requests" },
];

export const encryptionCards = [
  { key: "encryptedRequests", label: "加密请求数" },
  { key: "encryptedRate", label: "加密请求率", unit: "%" },
  { key: "encryptedBytes", label: "加密带宽", unit: "bytes" },
  { key: "encryptedBytesRate", label: "加密带宽率", unit: "%" },
];

export const cacheCards = [
  { key: "cachedRequests", label: "已缓存的请求数" },
  { key: "hitRate", label: "缓存命中率", unit: "%" },
  { key: "cachedBytes", label: "已缓存的带宽", unit: "bytes" },
  { key: "cachedBytesRate", label: "缓存带宽率", unit: "%" },
];

export const errorCards = [
  { key: "clientErrors", label: "4xx 错误数", lowerIsBetter: true },
  { key: "clientErrorRate", label: "4xx 错误率", unit: "%", lowerIsBetter: true },
  { key: "serverErrors", label: "5xx 错误数", lowerIsBetter: true },
  { key: "serverErrorRate", label: "5xx 错误率", unit: "%", lowerIsBetter: true },
];

function values(total, encrypted, clientErrors, serverErrors) {
  return {
    ...total,
    hitRate: rate(total?.cachedRequests, total?.requests),
    cachedBytesRate: rate(total?.cachedBytes, total?.bytes),
    encryptedRequests: encrypted?.requests,
    encryptedRate: rate(encrypted?.requests, total?.requests),
    encryptedBytes: encrypted?.bytes,
    encryptedBytesRate: rate(encrypted?.bytes, total?.bytes),
    clientErrors,
    clientErrorRate: rate(clientErrors, total?.requests),
    serverErrors,
    serverErrorRate: rate(serverErrors, total?.requests),
  };
}

function indexByTime(series) {
  return new Map(series?.data.map((point) => [point.time, point]));
}

export function trafficSeries({ trend, encrypted, errorTrend }) {
  if (!trend?.data) return null;
  const encryptedByTime = indexByTime(encrypted?.data?.trend);
  const clientErrors = indexByTime(errorTrend?.data?.client);
  const serverErrors = indexByTime(errorTrend?.data?.server);
  return {
    ...trend.data,
    data: trend.data.data.map((point) => values(point, encryptedByTime.get(point.time),
      clientErrors.get(point.time)?.requests, serverErrors.get(point.time)?.requests)),
  };
}

export function trafficCards({ totals, encrypted, statuses }) {
  const current = values(totals?.data, encrypted?.data, statuses?.data?.totals[2], statuses?.data?.totals[3]);
  const previous = values(totals?.previous?.data, encrypted?.previous?.data,
    statuses?.previous?.data[0], statuses?.previous?.data[1]);
  return (cards) => cards.map((card) => ({
    ...card,
    value: current[card.key],
    previous: previous[card.key],
  }));
}
