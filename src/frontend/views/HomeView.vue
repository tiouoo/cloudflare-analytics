<script setup>
import { computed, ref, shallowRef, watch } from "vue";
import { Button, Select } from "ant-design-vue";
import { DeleteOutlined, GlobalOutlined, ReloadOutlined } from "@ant-design/icons-vue";
import { useRoute } from "vue-router";
import { currentSection } from "../analytics/sections.js";
import { useResource } from "../analytics/useResource.js";
import { queryCloudflare } from "../api/cloudflare.js";
import AnalyticsPanel from "../components/AnalyticsPanel.vue";

defineProps({ timeRange: String, dark: Boolean });

const route = useRoute();
const section = computed(() => currentSection(route.query.view));
const account = shallowRef(null);
const cache = shallowRef(new Map());
const zone = ref("");
const cacheCleared = ref(false);

watch([() => route.params.accountId, () => route.params.token], ([id, token]) => {
  account.value = id && token ? { id, token } : null;
  zone.value = "";
  cache.value = new Map();
  cacheCleared.value = false;
}, { immediate: true });

const {
  result: zoneResult,
  loading: zonesLoading,
  error: zonesError,
  refresh: refreshZones,
} = useResource(
  cache,
  computed(() => "zones"),
  (signal) => queryCloudflare("zones", { account: account.value, signal }),
);

const zones = computed(() => zoneResult.value?.data.zones ?? []);
const zoneOptions = computed(() =>
  zones.value.map(({ id, name }) => ({ value: id, label: name })),
);

watch(zones, (nextZones) => {
  if (!nextZones.some(({ id }) => id === zone.value)) zone.value = nextZones[0]?.id ?? "";
});

function clearCache() {
  cache.value.clear();
  cacheCleared.value = true;
}
</script>

<template>
  <section class="dashboard" aria-labelledby="dashboard-title">
    <header class="dashboard-header">
      <div>
        <h2 id="dashboard-title">{{ section.title }}</h2>
      </div>
      <div class="dashboard-controls">
        <div v-if="!section.accountWide" class="zone-control">
          <label for="zone-select">
            <GlobalOutlined aria-hidden="true" />
            站点
          </label>
          <Select
            id="zone-select"
            v-model:value="zone"
            aria-label="站点"
            class="zone-select"
            :options="zoneOptions"
            :loading="zonesLoading"
            :disabled="!zones.length"
            show-search
            option-filter-prop="label"
          />
        </div>
        <Button
          class="clear-cache"
          :aria-label="cacheCleared ? '再次清除浏览器缓存' : '清除浏览器缓存'"
          @click="clearCache"
        >
          <DeleteOutlined aria-hidden="true" />
          <span>{{ cacheCleared ? "缓存已清除" : "清除缓存" }}</span>
        </Button>
      </div>
    </header>

    <div v-if="section.accountWide || zone" class="panel-grid">
      <AnalyticsPanel
        v-for="name in section.panels"
        :key="name"
        :name="name"
        :cache="cache"
        :zone="section.accountWide ? undefined : zone"
        :account="account"
        :range="timeRange"
        :dark="dark"
      />
    </div>

    <div v-else class="zone-state" :aria-busy="zonesLoading">
      <GlobalOutlined class="zone-state-icon" aria-hidden="true" />
      <p v-if="zonesLoading" role="status">正在读取 Cloudflare 站点…</p>
      <template v-else>
        <p :role="zonesError ? 'alert' : 'status'">
          {{ zonesError || "此账户下没有可访问的站点。" }}
        </p>
        <Button @click="refreshZones">
          <ReloadOutlined aria-hidden="true" />
          重新读取站点
        </Button>
      </template>
    </div>
  </section>
</template>

<style scoped>
.dashboard {
  max-width: 1460px;
  margin-inline: auto;
}

.dashboard-header,
.dashboard-controls,
.zone-control,
.zone-control label {
  display: flex;
  align-items: center;
}

.dashboard-header {
  min-height: 48px;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 14px 24px;
  margin-bottom: 20px;
}

.dashboard-header h2 {
  color: var(--text);
  font-size: clamp(24px, 3vw, 34px);
  font-weight: 650;
  letter-spacing: -0.03em;
}

.dashboard-controls {
  max-width: 100%;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.zone-control {
  min-width: 0;
  gap: 8px;
}

.zone-control label {
  flex-shrink: 0;
  gap: 6px;
  color: var(--muted);
}

.zone-select {
  width: clamp(126px, 26vw, 228px);
}

.clear-cache {
  flex-shrink: 0;
}

.panel-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.zone-state {
  display: grid;
  min-height: 220px;
  align-content: center;
  justify-items: center;
  gap: 12px;
  padding: 22px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  color: var(--muted);
  text-align: center;
}

.zone-state-icon {
  color: var(--accent);
  font-size: 24px;
}

@media (max-width: 620px) {
  .dashboard-header {
    align-items: start;
    flex-direction: column;
    margin-bottom: 16px;
  }

  .panel-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
}
</style>
