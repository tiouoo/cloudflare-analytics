const byteUnits = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"];
const numbers = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 });
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

export function formatAxis(value, unit) {
  return unit || Math.abs(value) < 10_000 ? formatMetric(value, unit) : compact.format(value);
}

export function countryName(value) {
  return /^[A-Z]{2}$/.test(value) ? regions.of(value) ?? value : value;
}
