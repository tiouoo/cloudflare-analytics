<script setup>
const props = defineProps({ panel: Object, failed: String, chart: Boolean });
const dates = new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" });

function availableWindow() {
  return dates.formatRange(new Date(props.panel.from), new Date(props.panel.to));
}
</script>

<template>
  <p v-if="panel?.error || failed" class="panel-message" role="status">{{ panel?.error || failed }}</p>
  <template v-else-if="panel">
    <p v-if="panel.limited" class="window-note">Cloudflare 可查询范围 {{ availableWindow() }}</p>
    <slot :data="panel.data" />
  </template>
  <div v-else class="panel-loading" :class="{ 'panel-loading-chart': chart }" aria-label="待读取 Cloudflare 数据">
    <span /><span />
  </div>
</template>
