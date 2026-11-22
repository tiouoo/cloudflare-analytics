<script setup>
import { computed, ref } from "vue";
import { formatExactNumber, formatNumber } from "../analytics/panels.js";

const props = defineProps({ rows: { type: Array, required: true }, ring: Boolean, group: String });
const ringCutout = 0.69;
const hovered = ref(null);
const focused = ref(null);
const segments = computed(() => {
  const total = props.rows.reduce((sum, { value }) => sum + value, 0);
  let start = 0;
  return props.rows.map(({ label, value, id }, index) => {
    const width = total ? 100 * value / total : 0;
    const segment = { index, label, value, id, width, start, color: `var(--series-${index % 5 + 1})` };
    start += width;
    return segment;
  });
});
const visibleSegments = computed(() => segments.value.filter(({ width }) => width > 0));
const active = computed(() => segments.value[hovered.value ?? focused.value]);
const gradient = computed(() => {
  const stops = visibleSegments.value.map(({ index, color, start, width }) => {
    const fill = active.value && active.value.index !== index ? `color-mix(in srgb, ${color} 28%, var(--surface))` : color;
    return `${fill} ${start}% ${start + width}%`;
  });
  return `conic-gradient(${stops.join(", ")})`;
});

function inspectRing(event) {
  const { left, top, width, height } = event.currentTarget.getBoundingClientRect();
  const x = event.clientX - left - width / 2;
  const y = event.clientY - top - height / 2;
  const radius = Math.hypot(x, y) / (width / 2);
  if (radius < ringCutout || radius > 1) {
    hovered.value = null;
    return;
  }
  const position = (Math.atan2(x, -y) / (2 * Math.PI) * 100 + 100) % 100;
  hovered.value = visibleSegments.value.find(({ start, width }) => position >= start && position < start + width)?.index ?? null;
}
</script>

<template>
  <div class="request-distribution" @keydown.esc="hovered = focused = null">
    <ul v-if="rows.length" class="distribution-legend" @pointerleave="hovered = null">
      <li v-for="{ index, label, value, color, id } in segments" :key="index" :id="id"
        :data-dashboard-anchor="id ? '' : null" :data-group="id ? group : null">
        <button type="button" :class="{ 'is-active': active?.index === index }"
          :aria-label="label + '，' + formatExactNumber(value) + ' 次请求'"
          @pointerenter="hovered = index" @focus="focused = index" @blur="focused = null" @click="focused = index">
          <i :style="{ backgroundColor: color }" aria-hidden="true" />
          <span>{{ label }}</span>
          <strong>{{ formatNumber(value) }}</strong>
        </button>
      </li>
    </ul>
    <div v-if="visibleSegments.length || (rows.length && active)" class="distribution-graphic"
      :class="{ 'distribution-graphic-ring': ring }" aria-hidden="true">
      <div v-if="ring && visibleSegments.length" class="distribution-ring"
        :style="{ background: gradient, '--ring-cutout': ringCutout * 100 + '%' }"
        @pointermove="inspectRing" @pointerleave="hovered = null" />
      <div v-else-if="visibleSegments.length" class="distribution-bar" @pointerleave="hovered = null">
        <span v-for="{ index, width, color } in visibleSegments" :key="index"
          :class="{ 'is-dimmed': active && active.index !== index }"
          :style="{ width: width + '%', backgroundColor: color }" @pointerenter="hovered = index" />
      </div>
      <div v-if="active" class="distribution-tooltip" :style="{ '--segment-center': active.start + active.width / 2 + '%' }">
        <span>{{ active.label }}</span>
        <strong>{{ formatExactNumber(active.value) }} 次请求</strong>
      </div>
    </div>
    <p v-if="!rows.length" class="panel-message">所选时间内暂无数据</p>
  </div>
</template>
