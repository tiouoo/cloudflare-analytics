<script setup>
import { computed } from "vue";
import { formatMetric } from "../analytics/panels.js";
import MetricSparkline from "./MetricSparkline.vue";

const props = defineProps({
  cards: { type: Array, required: true },
  anchor: Function,
  dark: Boolean,
});
const percent = new Intl.NumberFormat("zh-CN", { style: "percent", maximumFractionDigits: 1 });
const tiles = computed(() => props.cards.map((card) => {
  const { value, unit, previous, lowerIsBetter } = card;
  if (value == null || previous == null) return card;

  const change = previous ? (value - previous) / previous : 0;
  const hasBaseline = previous !== 0 || value === 0;
  const direction = change > 0 ? "↗" : change < 0 ? "↘" : "→";
  return {
    ...card,
    change: hasBaseline ? direction + " " + percent.format(Math.abs(change)) : "↗ 新增",
    hint: "上一同等时段 " + formatMetric(previous, unit),
    tone: change === 0 && hasBaseline ? "steady" : (value > previous) === !lowerIsBetter ? "good" : "bad",
    accessibleChange: hasBaseline
      ? (change > 0 ? "上升 " : change < 0 ? "下降 " : "持平 ") + percent.format(Math.abs(change))
      : "上一同等时段为零，本期新增",
  };
}));
</script>

<template>
  <dl class="kpi-grid">
    <div v-for="tile in tiles" :key="tile.key" class="kpi">
      <dt>
        <a v-if="tile.target && anchor" :href="'#' + anchor(tile.target)">{{ tile.label }}</a>
        <span v-else>{{ tile.label }}</span>
      </dt>
      <dd>
        <span class="kpi-value" :class="{ 'kpi-empty': tile.value == null }">{{ formatMetric(tile.value, tile.unit) }}</span>
        <span v-if="tile.change" class="kpi-change" :data-tone="tile.tone" :title="tile.hint">
          <span aria-hidden="true">{{ tile.change }}</span>
          <span class="sr-only">{{ tile.accessibleChange }}，{{ tile.hint }}</span>
        </span>
      </dd>
      <div class="kpi-trend">
        <MetricSparkline v-if="tile.points.some((point) => point != null)" :points="tile.points" :dark="dark"
          :percentage="tile.unit === '%'" />
      </div>
    </div>
  </dl>
</template>
