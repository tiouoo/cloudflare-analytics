const byteUnits = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"];
const numbers = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 });
const regions = new Intl.DisplayNames("zh-CN", { type: "region", fallback: "none" });

export function formatNumber(value) {
  if (value == null) return "—";
  if (Math.abs(value) >= 1_000) return (value / 1_000).toFixed(2) + " k";
  return numbers.format(value);
}

export function formatMetric(value, unit) {
  if (value == null) return "—";
  if (!unit) return formatNumber(value);
  if (unit !== "bytes") return numbers.format(value) + unit;

  let magnitude = 0;
  while (value >= 1024 && magnitude < byteUnits.length - 1) {
    value /= 1024;
    magnitude += 1;
  }
  return numbers.format(value) + " " + byteUnits[magnitude];
}

export function countryName(value) {
  return /^[A-Z]{2}$/.test(value) ? regions.of(value) ?? value : value;
}
