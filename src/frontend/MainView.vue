<script setup>
import { computed, ref, watchEffect } from "vue";
import { useRoute } from "vue-router";
import { CloudOutlined, GithubOutlined } from "@ant-design/icons-vue";
import { timeRanges } from "../analytics/ranges.js";
import DashboardPicker from "./components/DashboardPicker.vue";

const route = useRoute();
const dashboard = computed(
  () => route.name === "home" || route.name === "account",
);
const dark = ref(window.matchMedia("(prefers-color-scheme: dark)").matches);
const themeLabel = computed(() =>
  dark.value ? "切换浅色模式" : "切换深色模式",
);
const timeRange = ref("24h");
const timeOptions = timeRanges.map(({ value, label }) => ({ value, label }));
watchEffect(() => {
  document.documentElement.dataset.theme = dark.value ? "dark" : "light";
});
</script>

<template>
  <header class="masthead">
    <div class="masthead-inner">
      <div class="header-brand">
        <div id="mobile-directory" />
        <CloudOutlined class="brand-icon" aria-hidden="true" />
        <span class="brand-name">Cloudflare Analytics</span>
      </div>
      <div class="header-controls">
        <DashboardPicker
          v-if="dashboard"
          v-model="timeRange"
          label="时间范围"
          :options="timeOptions"
        />
        <button
          type="button"
          class="icon-button theme-button"
          :aria-label="themeLabel"
          :title="themeLabel"
          @click="dark = !dark"
        >
          <span class="theme-icon" :class="{ sun: dark }" aria-hidden="true" />
        </button>
        <a
          class="icon-button"
          href="https://github.com/tiouoo/cloudflare-analytics"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub 仓库"
          title="GitHub 仓库"
        >
          <GithubOutlined aria-hidden="true" />
        </a>
      </div>
    </div>
  </header>
  <RouterView v-slot="{ Component }">
    <component :is="Component" v-bind="dashboard ? { timeRange, dark } : {}" />
  </RouterView>
</template>
