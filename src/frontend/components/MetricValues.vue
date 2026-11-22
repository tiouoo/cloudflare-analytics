<script setup>
import { formatMetric } from "../analytics/panels.js";

defineProps({ items: { type: Array, required: true } });
</script>

<template>
  <dl class="metric-values">
    <div v-for="{ label, value, unit } in items" :key="label">
      <dt>{{ label }}</dt>
      <dd>{{ formatMetric(value, unit) }}</dd>
    </div>
  </dl>
</template>
