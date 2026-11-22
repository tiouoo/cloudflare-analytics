<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, useTemplateRef } from "vue";
import { GlobalOutlined } from "@ant-design/icons-vue";
import { countryName, formatNumber } from "../analytics/panels.js";
import { cacheCards, encryptionCards, errorCards, overviewCards, trafficCards, trafficSeries } from "../analytics/traffic.js";
import { useResource } from "../analytics/useResource.js";
import { queryCloudflare } from "../api/cloudflare.js";
import MetricBreakdown from "./MetricBreakdown.vue";
import MetricValues from "./MetricValues.vue";
import PanelContent from "./PanelContent.vue";
import RequestDistribution from "./RequestDistribution.vue";
import TrafficCards from "./TrafficCards.vue";
import TrafficTrend from "./TrafficTrend.vue";

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
const securityActionLabel = "安全规则处理的 HTTP 请求";
const anchor = (key) => props.group.id + "-" + key;
const series = computed(() => trafficSeries(panels.value));
const cards = computed(() => trafficCards(panels.value));
const rankingTotal = (key) => panels.value[key]?.from === panels.value.totals?.from ? totals.value?.requests : undefined;
const seriesOptions = [
  { key: "requests", label: "请求数" },
  { key: "visits", label: "访问次数" },
  { key: "bytes", label: "流量", unit: "bytes" },
  { key: "hitRate", label: "缓存命中率", unit: "%" },
];
const metricSections = [
  { key: "encryption", title: "安全性", panel: "encrypted", trendPanel: "encrypted", cards: encryptionCards },
  { key: "cache", title: "缓存", panel: "totals", cards: cacheCards },
  { key: "errors", title: "HTTP 错误", panel: "statuses", trendPanel: "errorTrend", cards: errorCards },
];
const selectedTrafficMetric = ref(seriesOptions[0].key);
const selectedSectionMetrics = reactive(Object.fromEntries(metricSections.map(({ key, cards }) => [key, cards[0].key])));
const devices = { desktop: "桌面", mobile: "手机", tablet: "平板" };
const cacheStatuses = {
  hit: "命中", miss: "未命中", dynamic: "动态", expired: "已过期", bypass: "绕过",
  revalidated: "重新验证", stale: "陈旧", updating: "正在更新", none: "无", unknown: "未知",
};
const rankGroups = [
  { key: "versions", title: "协议与内容", compact: true, rankings: [
    ["versions", "HTTP 版本"], ["tls", "TLS 版本", (value) => value === "none" ? "未加密" : value],
    ["contentTypes", "热门内容类型", (value) => value || "无内容类型"],
    ["tlsKeyExchangeGroups", "TLS 密钥交换组", (value) => value === "none" ? "无" : value],
  ] },
  { key: "rankings", title: "HTTP 请求排行", rankings: [
    ["paths", "热门路径"], ["hosts", "热门主机"], ["ips", "热门客户端 IP"],
    ["browsers", "热门浏览器"], ["operatingSystems", "热门操作系统"], ["userAgents", "热门 User-Agent"],
    ["cacheStatuses", "热门缓存状态", (value) => cacheStatuses[value?.toLowerCase()] ?? value],
    ["originStatuses", "热门源站状态码", (value) => value === 0 ? "无源站响应" : value],
    ["methods", "热门 HTTP 方法"],
  ] },
];
const statusLabels = ["2xx 成功", "3xx 重定向", "4xx 客户端错误", "5xx 服务器错误"];
const statusDistribution = (values) => values.map((value, index) => ({
  label: statusLabels[index], value, id: index < 2 ? anchor(index + 2 + "xx") : undefined,
}));
const productValues = [
  { key: "pages", title: "Pages Functions", metrics: [["requests", "调用数"], ["errors", "错误数"]] },
  { key: "d1", title: "D1", metrics: [["readQueries", "读取查询"], ["writeQueries", "写入查询"], ["rowsRead", "读取行数"], ["rowsWritten", "写入行数"]] },
  { key: "r2", title: "R2", metrics: [["requests", "操作数"], ["responseBytes", "响应流量", "bytes"]] },
];
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
    <TrafficCards :cards="cards(overviewCards)" :anchor="anchor" class="overview-metrics" />
    <p v-if="totals && !panels.totals.previous" class="panel-message comparison-note">当前时间范围缺少完整的上一同等时段数据，环比暂不可用。</p>

    <article :id="anchor('requests')" class="panel traffic-panel" data-dashboard-anchor :data-group="group.id">
      <TrafficTrend v-model="selectedTrafficMetric" title="HTTP 流量趋势" label="流量趋势指标" :metrics="seriesOptions"
        :panel="panels.trend" :series="series" :failed="error" :dark="dark" />
    </article>

    <section v-for="{ key, title, panel, trendPanel, cards: metrics } in metricSections" :id="anchor(key)" :key="key"
      class="metric-section" data-dashboard-anchor :data-group="group.id">
      <h3 class="section-heading">{{ title }}</h3>
      <div class="panel metric-summary">
        <TrafficCards v-model:selected="selectedSectionMetrics[key]" :cards="cards(metrics)" />
        <p v-if="panels[panel]?.error" class="panel-message metric-note">{{ panels[panel].error }}</p>
        <div class="metric-trend">
          <TrafficTrend v-model="selectedSectionMetrics[key]" :label="title + '趋势指标'"
            :metrics="metrics" :panel="panels.trend" :series="series"
            :failed="error || panels[trendPanel]?.error" :dark="dark" />
        </div>
      </div>
    </section>

    <section :id="anchor('audience')" class="audience-grid" data-dashboard-anchor :data-group="group.id">
      <article class="panel">
        <h3>设备类型</h3>
        <PanelContent :panel="panels.devices" :failed="error" v-slot="{ data }">
          <RequestDistribution :rows="data.map(({ label, value }) => ({ label: devices[label?.toLowerCase()] ?? label ?? '未知', value }))" ring />
        </PanelContent>
      </article>
      <article class="panel">
        <header class="panel-header">
          <h3>国家或地区</h3>
          <p v-if="totals" class="panel-message">页面浏览量 <strong>{{ formatNumber(totals.pageViews) }}</strong></p>
        </header>
        <PanelContent :panel="panels.countries" :failed="error" v-slot="{ data }">
          <MetricBreakdown :rows="data" dimension="国家或地区" :label="countryName" :total="totals?.requests" ranked />
        </PanelContent>
      </article>
    </section>

    <article class="panel">
      <h3>HTTP 响应状态</h3>
      <PanelContent :panel="panels.statuses" :failed="error" v-slot="{ data }">
        <RequestDistribution :rows="statusDistribution(data.totals)" :group="group.id" />
        <details v-if="data.codes.length" class="status-details">
          <summary>查看各边缘状态码</summary>
          <MetricBreakdown :rows="data.codes" dimension="边缘响应状态码" :total="totals?.requests" ranked />
        </details>
      </PanelContent>
    </article>

    <section v-for="{ key, title, rankings, compact } in rankGroups" :id="anchor(key)" :key="key" class="rank-section"
      data-dashboard-anchor :data-group="group.id">
      <h3 class="section-heading">{{ title }}</h3>
      <div class="rank-grid" :class="{ 'rank-grid-two': compact }">
        <article v-for="[metric, label, format] in rankings" :key="metric" class="panel rank-card">
          <h4>{{ label }}</h4>
          <PanelContent :panel="panels[metric]" :failed="error" v-slot="{ data }">
            <MetricBreakdown :rows="data" :dimension="label" :label="format" :total="rankingTotal(metric)" ranked />
          </PanelContent>
        </article>
      </div>
    </section>

    <article :id="anchor('security')" class="panel" data-dashboard-anchor :data-group="group.id">
      <h3>安全事件</h3>
      <div class="panel-split">
        <div v-if="panels.security?.data?.actions.length">
          <h4>防火墙事件</h4>
          <PanelContent :panel="panels.security" v-slot="{ data }">
            <MetricValues :items="[{ label: '事件总数', value: data.count }]" />
            <MetricBreakdown :rows="data.actions" dimension="动作" measure="事件数" />
          </PanelContent>
        </div>
        <div>
          <h4>{{ securityActionLabel }}</h4>
          <PanelContent :panel="panels.securityActions" :failed="error" v-slot="{ data }">
            <MetricBreakdown :rows="data.actions" dimension="动作" />
          </PanelContent>
        </div>
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
        <div v-if="panels.edge?.data != null">
          <h4>边缘耗时</h4>
          <PanelContent :panel="panels.edge" v-slot="{ data }">
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
