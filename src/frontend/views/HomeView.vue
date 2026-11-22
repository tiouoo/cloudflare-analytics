<script setup>
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  useTemplateRef,
  watch,
} from "vue";
import { CloseOutlined, MenuOutlined } from "@ant-design/icons-vue";
import { useRoute } from "vue-router";
import { dashboardSections } from "../analytics/sections.js";
import { useResource } from "../analytics/useResource.js";
import { queryCloudflare } from "../api/cloudflare.js";
import DashboardNav from "../components/DashboardNav.vue";
import DashboardScope from "../components/DashboardScope.vue";

defineProps({ timeRange: { type: String, required: true }, dark: Boolean });
const route = useRoute();
const account = computed(() => {
  const { accountId, token } = route.params;
  return accountId && token ? { id: accountId, token } : null;
});
const { result, error, loading } = useResource([account], (signal) =>
  queryCloudflare("zones", { account: account.value, signal }),
);
const zoneGroups = computed(() =>
  (result.value?.zones ?? []).map((zone) => ({
    ...dashboardSections(zone),
    zone,
  })),
);
const overview = dashboardSections();
const groups = computed(() => [overview, ...zoneGroups.value]);
const active = ref(overview.id);
const activeGroup = ref(overview.id);
const main = useTemplateRef("main");
const drawer = useTemplateRef("drawer");
const mobile = window.matchMedia("(max-width: 800px)");
let frame;
let resize;
let pendingHash = window.location.hash;

function updateActive() {
  const anchors = [
    ...(main.value?.querySelectorAll("[data-dashboard-anchor]") ?? []),
  ];
  if (!anchors.length) return;
  let current = anchors[0];
  const offset = parseFloat(getComputedStyle(current).scrollMarginTop) + 10;
  for (const node of anchors) {
    if (node.getBoundingClientRect().top > offset) break;
    current = node;
  }
  if (
    window.scrollY + window.innerHeight >=
      document.documentElement.scrollHeight - 2 &&
    window.scrollY > 0
  ) {
    const target = document.getElementById(window.location.hash.slice(1));
    const last = anchors.at(-1);
    current =
      anchors.includes(target) && target.getBoundingClientRect().top > offset
        ? target
        : last;
  }
  active.value = current.id;
  activeGroup.value = current.dataset.group;
}

function scheduleScrollUpdate() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(updateActive);
}

function restoreTarget() {
  if (!pendingHash) return;
  const target = document.getElementById(pendingHash.slice(1));
  if (!target) return;
  pendingHash = "";
  target.scrollIntoView({ block: "start", behavior: "instant" });
  scheduleScrollUpdate();
}

function onHashChange() {
  // The browser handles existing fragment targets. Keep a deep link pending while sites load.
  const hash = window.location.hash;
  pendingHash = hash && !document.getElementById(hash.slice(1)) ? hash : "";
  scheduleScrollUpdate();
}

function closeDrawerOnDesktop({ matches }) {
  if (!matches && drawer.value?.open) drawer.value.close();
}

onMounted(() => {
  resize = new ResizeObserver(scheduleScrollUpdate);
  resize.observe(main.value);
  window.addEventListener("scroll", scheduleScrollUpdate, { passive: true });
  window.addEventListener("resize", scheduleScrollUpdate);
  window.addEventListener("hashchange", onHashChange);
  mobile.addEventListener("change", closeDrawerOnDesktop);
  restoreTarget();
  scheduleScrollUpdate();
});
onUnmounted(() => {
  resize?.disconnect();
  cancelAnimationFrame(frame);
  window.removeEventListener("scroll", scheduleScrollUpdate);
  window.removeEventListener("resize", scheduleScrollUpdate);
  window.removeEventListener("hashchange", onHashChange);
  mobile.removeEventListener("change", closeDrawerOnDesktop);
});
watch(groups, async () => {
  await nextTick();
  restoreTarget();
  scheduleScrollUpdate();
});
</script>

<template>
  <div class="dashboard-layout">
    <aside class="dashboard-sidebar">
      <DashboardNav
        :groups="groups"
        :active="active"
        :active-group="activeGroup"
      />
    </aside>
    <Teleport to="#mobile-directory">
      <button
        type="button"
        class="icon-button"
        aria-label="本页目录"
        aria-haspopup="dialog"
        @click="drawer.showModal()"
      >
        <MenuOutlined aria-hidden="true" />
      </button>
    </Teleport>
    <main ref="main" class="dashboard-main">
      <DashboardScope
        :group="overview"
        :account="account"
        :range="timeRange"
        :dark="dark"
      />
      <DashboardScope
        v-for="group in zoneGroups"
        :key="group.zone.id"
        :group="group"
        :zone="group.zone"
        :account="account"
        :range="timeRange"
        :dark="dark"
      />
      <div v-if="!zoneGroups.length" class="sites-message">
        <h2>站点分析</h2>
        <p :role="error ? 'alert' : 'status'">
          {{
            loading
              ? "正在读取 Cloudflare 站点…"
              : error || "没有可显示的站点。"
          }}
        </p>
      </div>
    </main>
    <dialog
      ref="drawer"
      class="index-drawer"
      aria-labelledby="drawer-title"
      @click.self="drawer.close()"
    >
      <div class="drawer-content">
        <header>
          <strong id="drawer-title">目录</strong>
          <button
            type="button"
            class="icon-button"
            aria-label="关闭目录"
            @click="drawer.close()"
          >
            <CloseOutlined aria-hidden="true" />
          </button>
        </header>
        <DashboardNav
          :groups="groups"
          :active="active"
          :active-group="activeGroup"
          @navigate="drawer.close()"
        />
      </div>
    </dialog>
  </div>
</template>
