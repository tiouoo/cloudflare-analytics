<script setup>
import { onUnmounted, useTemplateRef, watch } from "vue";
import { Chart, Filler, LineController, LineElement, LinearScale, PointElement } from "chart.js";

Chart.register(LineController, LineElement, LinearScale, PointElement, Filler);

const props = defineProps({ points: { type: Array, required: true }, dark: Boolean, percentage: Boolean });
const canvas = useTemplateRef("canvas");
let chart;

watch([canvas, () => props.points, () => props.dark], () => {
  chart?.destroy();
  if (!canvas.value) return;
  const color = getComputedStyle(canvas.value).getPropertyValue("--accent").trim();
  chart = new Chart(canvas.value, {
    type: "line",
    data: {
      datasets: [{
        data: props.points.map((y, x) => ({ x, y })),
        borderColor: color,
        backgroundColor: color + "26",
        borderWidth: 1.25,
        pointRadius: ({ dataIndex }) => props.points[dataIndex - 1] == null && props.points[dataIndex + 1] == null ? 1.5 : 0,
        fill: "origin",
      }],
    },
    options: {
      animation: false,
      events: [],
      parsing: false,
      normalized: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 2, bottom: 2, left: 1, right: 1 } },
      scales: {
        x: { type: "linear", display: false },
        y: { type: "linear", display: false, min: 0, max: props.percentage ? 100 : undefined },
      },
    },
  });
}, { flush: "post" });

onUnmounted(() => chart?.destroy());
</script>

<template>
  <div class="sparkline" aria-hidden="true"><canvas ref="canvas" /></div>
</template>

<style scoped>
.sparkline { position: relative; height: 31px; min-width: 0; }
.sparkline canvas { position: absolute; inset: 0; max-width: 100%; }
</style>
