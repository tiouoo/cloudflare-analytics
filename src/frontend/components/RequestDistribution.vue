<script setup>
import { computed } from "vue";
import { formatNumber } from "../analytics/panels.js";

const props = defineProps({ rows: { type: Array, required: true }, ring: Boolean, group: String });
const segments = computed(() => {
  const total = props.rows.reduce((sum, { value }) => sum + value, 0);
  let start = 0;
  return props.rows.map(({ label, value, id }, index) => {
    const width = total ? 100 * value / total : 0;
    const segment = { label, value, id, width, start, color: `var(--series-${index % 5 + 1})` };
    start += width;
    return segment;
  });
});
const gradient = computed(() => "conic-gradient(" + segments.value.filter(({ width }) => width > 0)
  .map(({ color, start, width }) => `${color} ${start}% ${start + width}%`).join(", ") + ")");
</script>

<template>
  <ul v-if="rows.length" class="distribution-legend">
    <li v-for="{ label, value, color, id } in segments" :key="label" :id="id"
      :data-dashboard-anchor="id ? '' : null" :data-group="id ? group : null">
      <i :style="{ backgroundColor: color }" aria-hidden="true" />
      <span>{{ label }}</span>
      <strong>{{ formatNumber(value) }}</strong>
    </li>
  </ul>
  <div v-if="segments.some(({ width }) => width > 0)" aria-hidden="true">
    <div v-if="ring" class="distribution-ring" :style="{ background: gradient }" />
    <div v-else class="distribution-bar">
      <span v-for="{ label, width, color } in segments" :key="label" :style="{ width: width + '%', backgroundColor: color }" />
    </div>
  </div>
  <p v-else class="panel-message">所选时间内暂无数据</p>
</template>
