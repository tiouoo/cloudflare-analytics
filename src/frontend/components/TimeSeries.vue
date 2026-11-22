<script setup>
import { onUnmounted, useTemplateRef, watchPostEffect } from "vue";
import {
  Chart,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { formatNumber } from "../analytics/panels.js";

Chart.register(LineController, LineElement, LinearScale, PointElement, Filler, Tooltip);

const props = defineProps({
  series: { type: Object, required: true },
  dark: Boolean,
});

const canvas = useTemplateRef("canvas");
let chart;

watchPostEffect(() => {
  if (!canvas.value) return;

  const { data, from, to, bucket } = props.series;
  const styles = getComputedStyle(document.documentElement);
  const accent = styles.getPropertyValue("--accent").trim();
  const grid = styles.getPropertyValue("--border").trim();
  const text = styles.getPropertyValue(props.dark ? "--text" : "--muted").trim();
  const date = new Intl.DateTimeFormat("zh-CN", bucket === "date"
    ? { month: "numeric", day: "numeric", timeZone: "UTC" }
    : { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

  chart?.destroy();
  chart = new Chart(canvas.value, {
    type: "line",
    data: {
      datasets: [{
        label: "HTTP 请求",
        data: data.map(({ label, value }) => ({ x: Date.parse(label), y: value })),
        borderColor: accent,
        backgroundColor: accent + "22",
        fill: "origin",
        borderWidth: 2,
        pointRadius: data.length === 1 ? 4 : 0,
        pointHoverRadius: 4,
        tension: 0.2,
      }],
    },
    options: {
      color: text,
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { intersect: false, mode: "nearest", axis: "x" },
      scales: {
        x: {
          type: "linear",
          min: Math.min(Date.parse(from), Date.parse(data[0].label)),
          max: Date.parse(to),
          grid: { display: false },
          border: { color: grid },
          ticks: { maxTicksLimit: 6, callback: (value) => date.format(value) },
        },
        y: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: grid },
          ticks: { maxTicksLimit: 5, precision: 0, callback: formatNumber },
        },
      },
      plugins: {
        tooltip: {
          callbacks: { title: ([point]) => date.format(point.parsed.x) },
        },
      },
    },
  });
});

onUnmounted(() => chart?.destroy());
</script>

<template>
  <div class="chart">
    <canvas ref="canvas" role="img" aria-label="按所选时间范围显示 HTTP 请求趋势" />
  </div>
</template>

<style scoped>
.chart {
  position: relative;
  height: clamp(220px, 32vw, 330px);
  min-width: 0;
}
</style>
