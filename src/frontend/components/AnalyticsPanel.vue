<script setup>
import { computed, defineAsyncComponent, toRef } from "vue";
import { Table } from "ant-design-vue";
import { ReloadOutlined } from "@ant-design/icons-vue";
import { queryCloudflare } from "../api/cloudflare.js";
import { formatMetric, formatNumber, panels } from "../analytics/panels.js";
import { useResource } from "../analytics/useResource.js";

const TimeSeries = defineAsyncComponent(() => import("./TimeSeries.vue"));
const bucketLabels = {
  datetimeMinute: "每分钟",
  datetimeFiveMinutes: "每 5 分钟",
  datetimeHour: "每小时",
  date: "每天（UTC）",
};
const updatedTime = new Intl.DateTimeFormat("zh-CN", { timeStyle: "short" });
const rangeTime = new Intl.DateTimeFormat("zh-CN", { dateStyle: "short", timeStyle: "short" });

const props = defineProps({
  name: { type: String, required: true },
  cache: { type: Map, required: true },
  zone: String,
  account: Object,
  range: { type: String, required: true },
  dark: Boolean,
});

const panel = panels[props.name];
const key = computed(() => props.name + "/" + (props.zone || "account") + "/" + props.range);
const { result, loading, error, cached, refresh } = useResource(
  toRef(props, "cache"),
  key,
  (signal) => queryCloudflare(props.name, {
    account: props.account,
    zone: props.zone,
    range: props.range,
    signal,
  }),
);

const payload = computed(() => result.value?.data);
const timeWindow = computed(() =>
  payload.value && rangeTime.formatRange(new Date(payload.value.from), new Date(payload.value.to)),
);
const columns = panel.dimension && [
  { title: panel.dimension, dataIndex: "label", ellipsis: true },
  {
    title: panel.count ?? "请求数",
    dataIndex: "value",
    align: "right",
    width: "25%",
    sorter: (left, right) => left.value - right.value,
  },
  ...(panel.errors ? [{
    title: "错误数",
    dataIndex: "errors",
    align: "right",
    width: "25%",
    sorter: (left, right) => left.errors - right.errors,
  }] : []),
];
</script>

<template>
  <article class="panel" :class="{ wide: panel.wide }" :aria-busy="loading">
    <header class="panel-header">
      <h3>{{ panel.title }}</h3>
      <button
        class="refresh"
        type="button"
        :aria-label="'刷新' + panel.title"
        :title="'刷新' + panel.title"
        :disabled="loading"
        @click="refresh"
      >
        <ReloadOutlined :spin="loading" aria-hidden="true" />
      </button>
    </header>
    <p v-if="error" class="state error" role="alert">{{ error }}</p>
    <template v-if="payload">
      <dl v-if="panel.metrics" class="metrics">
        <div v-for="metric in panel.metrics" :key="metric.key">
          <dt>{{ metric.title }}</dt>
          <dd>
            {{ payload.data[metric.key] == null
              ? "暂无数据"
              : formatMetric(payload.data[metric.key], metric.unit) }}
          </dd>
        </div>
      </dl>
      <p v-else-if="!payload.data.length" class="state">所选时间内暂无数据</p>
      <TimeSeries v-else-if="panel.chart" :series="payload" :dark="dark" />
      <Table
        v-else
        :columns="columns"
        :data-source="payload.data"
        :pagination="{ pageSize: 10, hideOnSinglePage: true, showSizeChanger: false, size: 'small' }"
        :show-sorter-tooltip="false"
        row-key="label"
        size="small"
      >
        <template #bodyCell="{ column, text }">
          <template v-if="column.dataIndex === 'label'">
            {{ (panel.label ? panel.label(text) : text) ?? '未知' }}
          </template>
          <template v-else>{{ formatNumber(text) }}</template>
        </template>
      </Table>
    </template>
    <div v-else-if="loading" class="loading-space" :class="{ 'loading-chart': panel.chart }">
      <span class="skeleton" />
      <span class="skeleton" />
    </div>
    <footer v-if="result" class="panel-meta">
      <span class="source" :class="{ cached }">{{ cached ? "浏览器缓存" : "Cloudflare" }}</span>
      <span :title="timeWindow">{{ timeWindow }}</span>
      <span v-if="payload.bucket">{{ bucketLabels[payload.bucket] }}</span>
      <time :datetime="new Date(result.updatedAt).toISOString()">
        {{ updatedTime.format(result.updatedAt) }} 更新
      </time>
    </footer>
  </article>
</template>

<style scoped>
.panel {
  min-width: 0;
  padding: clamp(14px, 2vw, 22px);
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
}

.wide {
  grid-column: 1 / -1;
}

.panel-header {
  display: flex;
  min-height: 32px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 650;
}

.refresh {
  display: grid;
  width: 34px;
  height: 34px;
  flex: none;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}

.refresh:hover:not(:disabled) {
  background: var(--hover);
  color: var(--accent-active);
}

.refresh:disabled {
  cursor: wait;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(130px, 100%), 1fr));
  gap: 18px;
  margin: 4px 0 0;
}

.metrics > div {
  min-width: 0;
}

.metrics dt {
  color: var(--muted);
  font-size: 13px;
}

.metrics dd {
  margin: 8px 0 0;
  font-size: clamp(20px, 2.5vw, 34px);
  font-weight: 650;
  line-height: 1.1;
  overflow-wrap: anywhere;
  font-variant-numeric: tabular-nums;
}

.metrics > div + div dd {
  font-size: clamp(19px, 2vw, 28px);
}

.state {
  padding: 12px 0;
  color: var(--muted);
}

.error {
  margin-bottom: 8px;
  padding: 8px 10px;
  border-radius: 7px;
  background: var(--danger-background);
  color: var(--danger);
}

.loading-space {
  display: grid;
  min-height: 70px;
  align-content: center;
  gap: 12px;
}

.loading-chart {
  min-height: clamp(220px, 32vw, 330px);
}

.skeleton {
  width: min(38%, 160px);
  height: 16px;
  border-radius: 5px;
  background: var(--hover);
}

.skeleton + .skeleton {
  width: min(25%, 100px);
}

.panel-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  color: var(--muted);
  font-size: 12px;
}

.panel-meta time {
  margin-inline-start: auto;
}

.source {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}

.source::before {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--signal-live);
  content: "";
}

.source.cached::before {
  background: var(--accent);
}
</style>
