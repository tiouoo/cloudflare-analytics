<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { CloudOutlined, CloseOutlined, MenuOutlined } from "@ant-design/icons-vue";
import { useRoute, useRouter } from "vue-router";
import { timeRanges } from "../analytics/ranges.js";
import { appName } from "../config.js";
import { currentSection } from "./analytics/sections.js";
import AccountPicker from "./components/AccountPicker.vue";
import DashboardNav from "./components/DashboardNav.vue";
import TimeRangePicker from "./components/TimeRangePicker.vue";

const props = defineProps({ dark: Boolean });
defineEmits(["toggle-theme"]);

const route = useRoute();
const router = useRouter();
const custom = computed(() => route.name === "account");
const dashboard = computed(() => custom.value || route.name === "home");
const current = computed(() => currentSection(route.query.view).id);
const themeLabel = computed(() => (props.dark ? "切换浅色模式" : "切换深色模式"));
const drawer = ref(null);
const mobile = window.matchMedia("(max-width: 800px)");

function closeOnDesktop() {
  if (!mobile.matches && drawer.value?.open) drawer.value.close();
}

onMounted(() => mobile.addEventListener("change", closeOnDesktop));
onUnmounted(() => mobile.removeEventListener("change", closeOnDesktop));

function selectSection(view) {
  drawer.value?.close();
  router.push({ query: view === "overview" ? {} : { view } });
}

const timeRangeStorageKey = appName + ":time-range";
const timeRange = ref("24h");

try {
  const saved = localStorage.getItem(timeRangeStorageKey);
  if (timeRanges.some(({ value }) => value === saved)) timeRange.value = saved;
} catch {}

watch(timeRange, (value) => {
  try {
    localStorage.setItem(timeRangeStorageKey, value);
  } catch {}
});
</script>

<template>
  <div class="workspace">
    <header class="content-header">
      <div class="header-brand">
        <button
          v-if="dashboard"
          class="icon-button navigation-trigger"
          type="button"
          aria-label="打开统计导航"
          aria-haspopup="dialog"
          @click="drawer.showModal()"
        >
          <MenuOutlined aria-hidden="true" />
        </button>
        <CloudOutlined class="brand-icon" aria-hidden="true" />
        <h1>cf.chilo.top</h1>
      </div>
      <div class="header-controls">
        <AccountPicker :custom="custom" />
        <TimeRangePicker v-model="timeRange" />
        <button
          class="icon-button theme-button"
          type="button"
          :aria-label="themeLabel"
          :title="themeLabel"
          @click="$emit('toggle-theme')"
        >
          <span class="theme-icon" :class="{ sun: dark }" aria-hidden="true" />
        </button>
      </div>
    </header>
    <div class="workspace-body">
      <aside v-if="dashboard" class="sidebar">
        <DashboardNav :active="current" @select="selectSection" />
      </aside>
      <main class="page-viewport">
        <RouterView v-slot="{ Component }">
          <component :is="Component" v-bind="dashboard ? { timeRange, dark } : {}" />
        </RouterView>
      </main>
    </div>
    <dialog
      v-if="dashboard"
      ref="drawer"
      class="nav-drawer"
      aria-labelledby="nav-drawer-title"
      @click.self="drawer.close()"
    >
      <div class="nav-drawer-header">
        <strong id="nav-drawer-title">统计导航</strong>
        <button
          class="icon-button"
          type="button"
          aria-label="关闭统计导航"
          @click="drawer.close()"
        >
          <CloseOutlined aria-hidden="true" />
        </button>
      </div>
      <DashboardNav :active="current" @select="selectSection" />
    </dialog>
  </div>
</template>

<style scoped>
.workspace {
  min-height: 100dvh;
}

.content-header {
  position: sticky;
  z-index: 5;
  top: 0;
  display: flex;
  min-height: 64px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 24px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.header-brand,
.header-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-brand h1 {
  font-size: 17px;
  font-weight: 650;
  white-space: nowrap;
}

.brand-icon {
  flex: none;
  color: var(--accent-active);
  font-size: 22px;
}

.icon-button {
  display: grid;
  width: 36px;
  height: 36px;
  flex: none;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text);
  font-size: 18px;
  cursor: pointer;
}

.icon-button:hover {
  background: var(--hover);
  color: var(--accent-active);
}

.theme-button {
  color: var(--accent);
}

.theme-icon {
  width: 18px;
  height: 18px;
  background: currentColor;
  mask: url("./assets/icons/moon.svg") center / contain no-repeat;
}

.theme-icon.sun {
  mask-image: url("./assets/icons/sun.svg");
}

.workspace-body {
  display: flex;
  min-height: calc(100dvh - 64px);
}

.sidebar {
  position: sticky;
  top: 64px;
  width: 204px;
  height: calc(100dvh - 64px);
  flex: none;
  overflow: auto;
  border-inline-end: 1px solid var(--border);
  background: var(--surface);
}

.page-viewport {
  min-width: 0;
  flex: 1;
  padding: clamp(20px, 3vw, 44px);
}

.navigation-trigger {
  display: none;
}

.nav-drawer {
  position: fixed;
  inset: 0 auto 0 0;
  width: min(270px, 86vw);
  max-width: none;
  height: 100dvh;
  max-height: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  border: 0;
  border-inline-end: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
}

.nav-drawer::backdrop {
  background: rgb(20 18 29 / 38%);
}

.nav-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 12px 22px;
  border-bottom: 1px solid var(--border);
}

@media (max-width: 800px) {
  .sidebar {
    display: none;
  }

  .navigation-trigger {
    display: grid;
  }

  .content-header {
    padding-inline: 12px;
  }
}

@media (max-width: 460px) {
  .content-header,
  .header-brand,
  .header-controls {
    gap: 5px;
  }

  .content-header {
    padding-inline: 8px;
  }

  .header-brand h1 {
    font-size: 15px;
  }

  .brand-icon {
    display: none;
  }

  .page-viewport {
    padding: 20px 14px;
  }
}

@media (max-width: 355px) {
  .header-brand h1 {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  .brand-icon {
    display: inline-flex;
  }
}
</style>
