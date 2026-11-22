<script setup>
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from "vue";
import { BarChartOutlined, CloudOutlined, DatabaseOutlined, GlobalOutlined, SafetyCertificateOutlined } from "@ant-design/icons-vue";
import { countryName, formatMetric } from "../analytics/panels.js";
import { useResource } from "../analytics/useResource.js";
import { queryCloudflare } from "../api/cloudflare.js";
import MetricBreakdown from "./MetricBreakdown.vue";
import MetricValues from "./MetricValues.vue";
import PanelContent from "./PanelContent.vue";
import TimeSeries from "./TimeSeries.vue";

const props = defineProps({
  group: { type: Object, required: true },
  zone: Object,
  account: Object,
  range: { type: String, required: true },
  dark: Boolean,
});
const scope = useTemplateRef("scope");
const ready = ref(!props.zone);
const { result, error, loading } = useResource(
  [() => props.account, () => props.range],
  (signal) => queryCloudflare(props.zone ? "site" : "overview", {
    range: props.range,
    account: props.account,
    zone: props.zone?.id,
    signal,
  }),
  ready,
);
let observer;
onMounted(() => {
  if (!props.zone) return;
  observer = new IntersectionObserver(([entry]) => { ready.value = entry.isIntersecting; }, {
    rootMargin: "160px 0px 360px",
  });
  observer.observe(scope.value);
});
onUnmounted(() => observer?.disconnect());

const panels = computed(() => result.value?.panels ?? {});
const totals = computed(() => panels.value.totals?.data);
const hitRate = computed(() => totals.value?.requests ? 100 * totals.value.cachedRequests / totals.value.requests : null);
const statusTotals = computed(() => panels.value.statuses?.data?.totals ?? []);
const errorRate = computed(() => totals.value?.requests && statusTotals.value.length
  ? 100 * (statusTotals.value[2] + statusTotals.value[3]) / totals.value.requests
  : null);
const kpis = computed(() => [
  { label: "HTTP 请求数", value: totals.value?.requests, panel: panels.value.totals, icon: BarChartOutlined, target: "requests" },
  { label: "HTTP 响应流量", value: totals.value?.bytes, unit: "bytes", panel: panels.value.totals, icon: CloudOutlined, target: "requests" },
  { label: "缓存命中率", value: hitRate.value, unit: "%", panel: panels.value.totals, icon: DatabaseOutlined, target: "cache" },
  { label: "安全事件", value: panels.value.security?.data?.count, panel: panels.value.security, icon: SafetyCertificateOutlined, target: "security" },
]);
const seriesOptions = [
  { key: "requests", label: "请求数" },
  { key: "bytes", label: "流量", unit: "bytes" },
  { key: "hitRate", label: "缓存命中率", unit: "%" },
];
const selectedSeries = ref(seriesOptions[0]);
const productValues = [
  { key: "pages", title: "Pages Functions", metrics: [["requests", "调用数"], ["errors", "错误数"]] },
  { key: "d1", title: "D1", metrics: [["readQueries", "读取查询"], ["writeQueries", "写入查询"], ["rowsRead", "读取行数"], ["rowsWritten", "写入行数"]] },
  { key: "r2", title: "R2", metrics: [["requests", "操作数"], ["responseBytes", "响应流量", "bytes"]] },
];
const anchor = (key) => props.group.id + "-" + key;
</script>

<template>
  <section ref="scope" class="dashboard-scope" :class="{ 'site-scope': zone }" :aria-labelledby="group.id" :aria-busy="loading">
    <header :id="group.id" class="scope-heading" data-dashboard-anchor :data-group="group.id">
      <div v-if="zone" class="scope-icon"><GlobalOutlined aria-hidden="true" /></div>
      <div>
        <p v-if="zone" class="scope-label">站点分析</p>
        <h2 v-if="zone">{{ group.title }}</h2>
        <h1 v-else>账户概览</h1>
      </div>
    </header>
    <p v-if="error" class="scope-error" role="alert">{{ error }}</p>
    <dl class="kpi-grid">
      <div v-for="kpi in kpis" :key="kpi.label" class="kpi">
        <dt>
          <component :is="kpi.icon" aria-hidden="true" />
          <a :href="'#' + anchor(kpi.target)">{{ kpi.label }}</a>
        </dt>
        <dd :class="{ 'kpi-empty': kpi.value == null }">{{ formatMetric(kpi.value, kpi.unit) }}</dd>
        <small v-if="kpi.panel?.error">数据不可用</small>
        <small v-else-if="kpi.panel?.limited">按可查询范围统计</small>
      </div>
    </dl>

    <article :id="anchor('requests')" class="panel traffic-panel" data-dashboard-anchor :data-group="group.id">
      <header class="panel-header">
        <h3>HTTP 流量趋势</h3>
        <div class="metric-switch" role="group" aria-label="趋势指标">
          <button v-for="metric in seriesOptions" :key="metric.key" type="button"
            :aria-pressed="selectedSeries.key === metric.key" @click="selectedSeries = metric">
            {{ metric.label }}
          </button>
        </div>
      </header>
      <PanelContent :panel="panels.trend" :failed="error" chart>
        <template #default="{ data }">
          <TimeSeries v-if="data.data.some((point) => point.requests > 0)" :series="data" :metric="selectedSeries" :dark="dark" />
          <p v-else class="panel-message empty-chart">所选时间内暂无 HTTP 请求</p>
        </template>
      </PanelContent>
    </article>

    <article :id="anchor('errors')" class="panel" data-dashboard-anchor :data-group="group.id">
      <h3>HTTP 响应状态</h3>
      <PanelContent :panel="panels.statuses" :failed="error">
        <MetricValues :items="[
          { label: '错误率（4xx + 5xx）', value: errorRate, unit: '%' },
          { label: '4xx 客户端错误', value: statusTotals[2] },
          { label: '5xx 服务器错误', value: statusTotals[3] },
        ]" />
      </PanelContent>
      <div v-for="({ key, label }, index) in [{ key: '2xx', label: '2xx 成功' }, { key: '3xx', label: '3xx 重定向' }]"
        :id="anchor(key)" :key="key" class="status-line" data-dashboard-anchor :data-group="group.id">
        <h4>{{ label }}</h4>
        <strong>{{ formatMetric(statusTotals[index]) }}</strong>
      </div>
      <details v-if="panels.statuses?.data?.codes.length" class="status-details">
        <summary>查看各状态码</summary>
        <MetricBreakdown :rows="panels.statuses.data.codes" dimension="边缘响应状态码" />
      </details>
    </article>

    <article :id="anchor('versions')" class="panel" data-dashboard-anchor :data-group="group.id">
      <h3>HTTP 版本</h3>
      <PanelContent :panel="panels.versions" :failed="error" v-slot="{ data }">
        <MetricBreakdown :rows="data" dimension="HTTP 版本" />
      </PanelContent>
    </article>

    <article :id="anchor('cache')" class="panel" data-dashboard-anchor :data-group="group.id">
      <h3>缓存命中率</h3>
      <PanelContent :panel="panels.totals" :failed="error" v-slot="{ data }">
        <MetricValues :items="[
          { label: '请求命中率', value: hitRate, unit: '%' },
          { label: '缓存命中请求', value: data.cachedRequests },
          { label: '缓存响应流量', value: data.cachedBytes, unit: 'bytes' },
          { label: '总响应流量', value: data.bytes, unit: 'bytes' },
        ]" />
      </PanelContent>
    </article>

    <article :id="anchor('security')" class="panel" data-dashboard-anchor :data-group="group.id">
      <h3>安全事件</h3>
      <div class="panel-split">
        <div>
          <h4>防火墙事件</h4>
          <PanelContent :panel="panels.security" :failed="error" v-slot="{ data }">
            <MetricBreakdown :rows="data.actions" dimension="动作" measure="事件数" />
          </PanelContent>
        </div>
        <div>
          <h4>安全规则处理的 HTTP 请求</h4>
          <PanelContent :panel="panels.securityActions" :failed="error" v-slot="{ data }">
            <MetricBreakdown :rows="data" dimension="动作" />
          </PanelContent>
        </div>
      </div>
    </article>

    <article :id="anchor('audience')" class="panel" data-dashboard-anchor :data-group="group.id">
      <h3>访问与地区</h3>
      <PanelContent :panel="panels.totals" :failed="error" v-slot="{ data }">
        <MetricValues :items="[{ label: '访问次数', value: data.visits }, { label: '页面浏览量', value: data.pageViews }]" />
      </PanelContent>
      <div class="panel-block">
        <PanelContent :panel="panels.countries" :failed="error" v-slot="{ data }">
          <MetricBreakdown :rows="data" dimension="国家或地区" :label="countryName" />
        </PanelContent>
      </div>
    </article>

    <article :id="anchor('dns')" class="panel" data-dashboard-anchor :data-group="group.id">
      <h3>DNS 查询</h3>
      <PanelContent :panel="panels.dns" :failed="error" v-slot="{ data }">
        <MetricBreakdown :rows="data" dimension="记录类型" measure="查询数" />
      </PanelContent>
    </article>

    <article :id="anchor('network')" class="panel" data-dashboard-anchor :data-group="group.id">
      <h3>性能与网络</h3>
      <div class="panel-split">
        <div>
          <h4>源站耗时</h4>
          <PanelContent :panel="panels.origin" :failed="error" v-slot="{ data }">
            <MetricValues :items="[{ label: '平均响应耗时', value: data, unit: ' ms' }]" />
          </PanelContent>
        </div>
        <div>
          <h4>边缘耗时</h4>
          <PanelContent :panel="panels.edge" :failed="error" v-slot="{ data }">
            <MetricValues :items="[{ label: '平均首字节耗时', value: data, unit: ' ms' }]" />
          </PanelContent>
        </div>
      </div>
      <div class="panel-block">
        <PanelContent :panel="panels.infrastructure" :failed="error" v-slot="{ data }">
          <MetricBreakdown :rows="data" dimension="边缘机房" />
        </PanelContent>
      </div>
    </article>

    <article :id="anchor('endpoints')" class="panel" data-dashboard-anchor :data-group="group.id">
      <h3>API Gateway</h3>
      <PanelContent :panel="panels.endpoints" :failed="error" v-slot="{ data }">
        <MetricBreakdown :rows="data" dimension="匹配的端点" />
      </PanelContent>
    </article>

    <article v-if="!zone" :id="anchor('products')" class="panel" data-dashboard-anchor :data-group="group.id">
      <h3>Cloudflare 产品</h3>
      <div class="panel-split">
        <div>
          <h4>Workers</h4>
          <PanelContent :panel="panels.workers" :failed="error" v-slot="{ data }">
            <MetricBreakdown :rows="data" dimension="脚本" measure="调用数" errors />
          </PanelContent>
        </div>
        <div>
          <h4>Turnstile</h4>
          <PanelContent :panel="panels.turnstile" :failed="error" v-slot="{ data }">
            <MetricBreakdown :rows="data" dimension="事件类型" measure="事件数" />
          </PanelContent>
        </div>
      </div>
      <div class="product-grid panel-block">
        <div v-for="{ key, title, metrics } in productValues" :key="key" class="product">
          <h4>{{ title }}</h4>
          <PanelContent :panel="panels[key]" :failed="error" v-slot="{ data }">
            <MetricValues :items="metrics.map(([field, label, unit]) => ({ label, value: data[field], unit }))" />
          </PanelContent>
        </div>
      </div>
    </article>
  </section>
</template>
