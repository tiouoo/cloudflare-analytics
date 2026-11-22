<script setup>
import { computed } from "vue";
import DashboardPicker from "./DashboardPicker.vue";
import PanelContent from "./PanelContent.vue";
import TimeSeries from "./TimeSeries.vue";

const props = defineProps({
  title: String,
  label: { type: String, required: true },
  metrics: { type: Array, required: true },
  panel: Object,
  series: Object,
  failed: String,
  dark: Boolean,
});

const selectedKey = defineModel({ type: String, required: true });
const options = computed(() => props.metrics.map(({ key, label }) => ({ value: key, label })));
const selected = computed(() => props.metrics.find(({ key }) => key === selectedKey.value));
const hasRequests = computed(() => props.series?.data.some(({ requests }) => requests > 0));
const hasSelectedData = computed(() => props.series?.data.some((point) => point[selected.value.key] != null));
</script>

<template>
  <header class="panel-header trend-header">
    <h3 v-if="title">{{ title }}</h3>
    <DashboardPicker v-model="selectedKey" :label="label" :options="options" />
  </header>
  <PanelContent :panel="panel" :failed="failed" chart>
    <TimeSeries v-if="hasRequests && hasSelectedData" :series="series" :metric="selected" :dark="dark" />
    <p v-else class="panel-message empty-chart">{{ hasRequests ? "所选指标暂无数据" : "所选时间内暂无 HTTP 请求" }}</p>
  </PanelContent>
</template>
