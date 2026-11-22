const byteUnits = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"];
const numbers = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 1 });
const regions = new Intl.DisplayNames("zh-CN", { type: "region", fallback: "none" });

export function formatNumber(value) {
  return value == null ? "—" : numbers.format(value);
}

export function formatMetric(value, unit) {
  if (value == null) return "—";
  if (unit !== "bytes") return formatNumber(value) + (unit ?? "");

  let magnitude = 0;
  while (value >= 1024 && magnitude < byteUnits.length - 1) {
    value /= 1024;
    magnitude += 1;
  }
  return formatNumber(value) + " " + byteUnits[magnitude];
}

function countryName(value) {
  return /^[A-Z]{2}$/.test(value) ? regions.of(value) ?? value : value;
}

export const panels = {
  requests: {
    title: "HTTP 请求",
    metrics: [
      { key: "requests", title: "请求次数" },
      { key: "bytes", title: "响应流量", unit: "bytes" },
    ],
  },
  visits: {
    title: "访问统计",
    metrics: [
      { key: "visits", title: "访问次数" },
      { key: "pageViews", title: "页面浏览量" },
    ],
  },
  trend: { title: "HTTP 请求趋势", chart: true, wide: true },
  countries: { title: "热门国家和地区", dimension: "国家或地区", label: countryName },
  "status-codes": { title: "HTTP 响应状态码", dimension: "状态码" },
  "api-requests": { title: "API Gateway 请求", dimension: "匹配的端点", wide: true },
  cache: {
    title: "缓存命中",
    wide: true,
    metrics: [
      { key: "hitRate", title: "请求命中率", unit: "%" },
      { key: "cachedRequests", title: "命中请求" },
      { key: "cachedBytes", title: "缓存响应流量", unit: "bytes" },
      { key: "bytes", title: "总响应流量", unit: "bytes" },
    ],
  },
  security: { title: "安全事件处理", dimension: "规则动作", count: "事件数", wide: true },
  dns: { title: "DNS 查询类型", dimension: "记录类型", count: "查询数", wide: true },
  workers: { title: "Workers 调用", dimension: "脚本", count: "调用数", errors: true, wide: true },
  performance: {
    title: "响应耗时",
    wide: true,
    metrics: [
      { key: "edge", title: "边缘平均首字节耗时", unit: " ms" },
      { key: "origin", title: "源站平均响应耗时", unit: " ms" },
    ],
  },
  infrastructure: { title: "热门边缘机房", dimension: "机房代码", wide: true },
};
