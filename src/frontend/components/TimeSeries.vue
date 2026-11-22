<script setup>
import { computed, onUnmounted, shallowRef, useTemplateRef, watch } from "vue";
import { Chart, Filler, LineController, LineElement, LinearScale, PointElement } from "chart.js";
import { formatExactNumber, formatMetric } from "../analytics/panels.js";

Chart.register(LineController, LineElement, LinearScale, PointElement, Filler);

const props = defineProps({
  series: { type: Object, required: true },
  metric: { type: Object, required: true },
  dark: Boolean,
});
const canvas = useTemplateRef("canvas");
const hover = shallowRef(null);
const hoverValue = computed(() => props.metric.unit
  ? formatMetric(hover.value?.y, props.metric.unit)
  : formatExactNumber(hover.value?.y));
let chart;

const bucketLabels = {
  datetimeMinute: "1 分钟", datetimeFiveMinutes: "5 分钟", datetimeFifteenMinutes: "15 分钟",
  datetimeHour: "1 小时", date: "1 天",
};
const timeLabel = computed(() => new Intl.DateTimeFormat("zh-CN", props.series.bucket === "date"
  ? { month: "long", day: "numeric", timeZone: "UTC" }
  : { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" },
));

function selectPoint(chart, index, pointer) {
  const point = chart?.data.datasets[0].data[index];
  if (!point) {
    hover.value = null;
    return;
  }
  const x = chart.scales.x.getPixelForValue(point.x);
  const at = pointer?.x ?? x;
  const tooltipWidth = Math.min(168, chart.width);
  hover.value = {
    time: point.x,
    y: point.y,
    index,
    x,
    left: Math.max(0, Math.min(chart.width - tooltipWidth, at + (at + tooltipWidth + 14 <= chart.width ? 14 : -tooltipWidth - 14))),
    top: Math.max(chart.chartArea.top + 8, Math.min(chart.chartArea.bottom - 64, (pointer?.y ?? chart.chartArea.top) - 35)),
  };
}

function moveWithKey(event) {
  if (!chart || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const last = props.series.data.length - 1;
  const index = hover.value?.index;
  const next = {
    ArrowLeft: index == null ? last : Math.max(0, index - 1),
    ArrowRight: index == null ? 0 : Math.min(last, index + 1),
    Home: 0,
    End: last,
  };
  selectPoint(chart, next[event.key]);
  chart.draw();
}

function clearHover() {
  hover.value = null;
  chart?.draw();
}

watch([canvas, () => props.series, () => props.metric, () => props.dark], () => {
  if (!canvas.value) return;
  const { data, bucket } = props.series;
  const { key, unit } = props.metric;
  const root = getComputedStyle(document.documentElement);
  const isDark = props.dark;
  const accent = root.getPropertyValue("--accent").trim();
  const grid = root.getPropertyValue("--border").trim();
  const text = root.getPropertyValue("--muted").trim();
  const surface = root.getPropertyValue("--surface").trim();
  const cursor = root.getPropertyValue("--chart-cursor").trim();
  const daily = bucket === "date";
  const spansDays = data.at(-1).time - data[0].time >= 172_800_000;
  const date = new Intl.DateTimeFormat("zh-CN", daily
    ? { month: "numeric", day: "numeric", timeZone: "UTC" }
    : {
        ...(spansDays ? { month: "numeric", day: "numeric" } : {}),
        hour: "2-digit", minute: "2-digit", hourCycle: "h23",
      });
  const step = (data[1]?.time ?? data[0].time + 60_000) - data[0].time;

  chart?.destroy();
  hover.value = null;
  chart = new Chart(canvas.value, {
    type: "line",
    data: {
      datasets: [{
        data: data.map((point) => ({ x: point.time, y: point[key] })),
        borderColor: accent,
        backgroundColor({ chart }) {
          if (!chart.chartArea) return accent + "22";
          const gradient = chart.ctx.createLinearGradient(0, chart.chartArea.top, 0, chart.chartArea.bottom);
          gradient.addColorStop(0, accent + (isDark ? "45" : "31"));
          gradient.addColorStop(1, accent + "02");
          return gradient;
        },
        fill: "origin",
        borderWidth: 2.25,
        cubicInterpolationMode: "monotone",
        pointHoverRadius: 0,
        pointRadius: (context) => data.length === 1 ||
          (context.raw?.y != null && data[context.dataIndex - 1]?.[key] == null && data[context.dataIndex + 1]?.[key] == null)
          ? 3 : 0,
      }],
    },
    options: {
      color: text,
      font: { family: root.fontFamily },
      responsive: true,
      maintainAspectRatio: false,
      normalized: true,
      animation: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? false : { duration: 360, easing: "easeOutQuart" },
      scales: {
        x: {
          type: "linear",
          min: data[0].time,
          max: data.length > 1 ? data.at(-1).time : data[0].time + step,
          grid: { display: false },
          border: { color: grid },
          ticks: { maxTicksLimit: 7, stepSize: step, maxRotation: 0, callback: (value) => date.format(value) },
          afterBuildTicks(scale) {
            const stride = Math.max(1, Math.ceil((data.length - 1) / (scale.width < 480 ? 4 : 7)));
            scale.ticks = data.filter((_point, index) => index % stride === 0).map(({ time }) => ({ value: time }));
          },
        },
        y: {
          beginAtZero: true,
          ...(unit === "%" ? { min: 0, max: 100 } : {}),
          border: { display: false, dash: [4, 4] },
          grid: { color: grid, drawTicks: false },
          ticks: { maxTicksLimit: 5, padding: 10, precision: 0, callback: (value) => formatMetric(value, unit) },
        },
      },
    },
    plugins: [{
      id: "hover-indicator",
      afterEvent(chart, args) {
        if (!args.inChartArea || args.event.type === "mouseout") {
          hover.value = null;
        } else {
          const time = chart.scales.x.getValueForPixel(args.event.x);
          const index = Math.max(0, Math.min(data.length - 1, Math.round((time - data[0].time) / step)));
          selectPoint(chart, index, args.event);
        }
        args.changed = true;
      },
      afterDatasetsDraw({ ctx, chartArea, scales }) {
        if (!hover.value) return;
        const { x, y } = hover.value;
        ctx.save();
        ctx.strokeStyle = cursor;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x, chartArea.top);
        ctx.lineTo(x, chartArea.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
        if (y != null) {
          ctx.beginPath();
          ctx.arc(x, scales.y.getPixelForValue(y), 4.5, 0, 2 * Math.PI);
          ctx.fillStyle = accent;
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = surface;
          ctx.stroke();
        }
        ctx.restore();
      },
    }],
  });
}, { immediate: true, flush: "post" });

onUnmounted(() => chart?.destroy());
</script>

<template>
  <div class="chart" tabindex="0" :aria-label="metric.label + '趋势，按方向键查看数据点'" @keydown="moveWithKey" @blur="clearHover">
    <canvas ref="canvas" role="img" :aria-label="metric.label + '趋势'" />
    <div v-if="hover" class="chart-tooltip" :style="{ transform: 'translate(' + hover.left + 'px,' + hover.top + 'px)' }">
      <small>{{ timeLabel.format(hover.time) }} · {{ bucketLabels[series.bucket] }}</small>
      <span><i />{{ metric.label }}<strong>{{ hoverValue }}</strong></span>
    </div>
    <span v-if="hover" class="sr-only" aria-live="polite">
      {{ timeLabel.format(hover.time) }} {{ metric.label }} {{ hoverValue }}
    </span>
  </div>
</template>

<style scoped>
.chart { position: relative; height: var(--plot-height); min-width: 0; }
.chart canvas { max-width: 100%; }
.chart-tooltip {
  position: absolute;
  z-index: 1;
  top: 0;
  left: 0;
  width: min(168px, 100%);
  padding: 9px 11px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--elevated);
  box-shadow: var(--float-shadow);
  pointer-events: none;
  transition: transform 110ms ease-out;
  animation: appear 140ms ease-out;
}
.chart-tooltip small { display: block; color: var(--muted); font-size: 11px; white-space: nowrap; }
.chart-tooltip span { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; margin-top: 5px; font-size: 12px; }
.chart-tooltip i { width: 6px; height: 6px; flex: none; border-radius: 50%; background: var(--accent); }
.chart-tooltip strong { margin-inline-start: auto; font-variant-numeric: tabular-nums; }
@keyframes appear { from { opacity: 0; } }
</style>
