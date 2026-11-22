const minute = 60_000;
const hour = 60 * minute;
const day = 24 * hour;

export const timeRanges = [
  {
    value: "15m",
    label: "近 15 分钟",
    duration: 15 * minute,
    bucket: "datetimeMinute",
  },
  {
    value: "30m",
    label: "近 30 分钟",
    duration: 30 * minute,
    bucket: "datetimeMinute",
  },
  { value: "1h", label: "近 1 小时", duration: hour, bucket: "datetimeMinute" },
  {
    value: "12h",
    label: "近 12 小时",
    duration: 12 * hour,
    bucket: "datetimeFiveMinutes",
  },
  { value: "24h", label: "近 24 小时", duration: day, bucket: "datetimeHour" },
  { value: "7d", label: "近 7 天", duration: 7 * day, bucket: "datetimeHour" },
  { value: "15d", label: "近 15 天", duration: 15 * day, bucket: "date" },
  { value: "30d", label: "近 30 天", duration: 30 * day, bucket: "date" },
];

export function bucketForDuration(duration) {
  return (
    timeRanges.find((range) => range.duration >= duration)?.bucket ?? "date"
  );
}
