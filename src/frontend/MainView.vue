<script setup>
import { computed, nextTick, ref, useId, watch } from "vue";
import { useRoute } from "vue-router";
import { appName } from "../config.js";

const props = defineProps({ dark: Boolean });
defineEmits(["toggle-theme"]);

const route = useRoute();
const themeLabel = computed(() =>
  props.dark ? "切换浅色模式" : "切换深色模式",
);

const timeRanges = [
  { value: "15m", label: "近 15 分钟" },
  { value: "30m", label: "近 30 分钟" },
  { value: "1h", label: "近 1 小时" },
  { value: "12h", label: "近 12 小时" },
  { value: "24h", label: "近 24 小时" },
  { value: "7d", label: "近 7 天" },
  { value: "15d", label: "近 15 天" },
  { value: "30d", label: "近 30 天" },
  { value: "6mo", label: "近半年" },
  { value: "1y", label: "近一年" },
  { value: "all", label: "所有时间" },
];
const timeRangeStorageKey = `${appName}:time-range`;
const timeRange = ref("24h");

try {
  const saved = localStorage.getItem(timeRangeStorageKey);
  if (timeRanges.some(({ value }) => value === saved)) {
    timeRange.value = saved;
  }
} catch {}

watch(timeRange, (value) => {
  try {
    localStorage.setItem(timeRangeStorageKey, value);
  } catch {}
});

const rangeListId = useId();
const rangeList = ref(null);
const rangeOpen = ref(false);
const activeRangeIndex = ref(0);
const selectedRange = computed(() =>
  timeRanges.find(({ value }) => value === timeRange.value),
);

function setActiveRange(index) {
  activeRangeIndex.value = index;
  nextTick(() => {
    rangeList.value?.children[index]?.scrollIntoView({ block: "nearest" });
  });
}

function toggleRange() {
  rangeOpen.value = !rangeOpen.value;
  if (rangeOpen.value) {
    setActiveRange(timeRanges.indexOf(selectedRange.value));
  }
}

function handleRangeClick(event) {
  event.currentTarget.focus();
  toggleRange();
}

function selectRange(index) {
  timeRange.value = timeRanges[index].value;
  rangeOpen.value = false;
}

function handleRangeKeydown(event) {
  switch (event.key) {
    case "ArrowDown":
    case "ArrowUp": {
      event.preventDefault();
      if (!rangeOpen.value) {
        toggleRange();
        break;
      }
      const step = event.key === "ArrowDown" ? 1 : -1;
      const index = activeRangeIndex.value + step;
      setActiveRange(Math.max(0, Math.min(timeRanges.length - 1, index)));
      break;
    }
    case "Home":
    case "End":
      if (!rangeOpen.value) break;
      event.preventDefault();
      setActiveRange(event.key === "Home" ? 0 : timeRanges.length - 1);
      break;
    case "Enter":
    case " ":
      if (!rangeOpen.value) break;
      event.preventDefault();
      selectRange(activeRangeIndex.value);
      break;
    case "Escape":
      if (!rangeOpen.value) break;
      event.preventDefault();
      rangeOpen.value = false;
      break;
  }
}
</script>

<template>
  <div class="workspace">
    <header class="content-header">
      <h1>cf.chilo.top</h1>
      <div class="header-controls">
        <div class="time-range">
          <button
            class="range-trigger"
            type="button"
            role="combobox"
            aria-label="时间范围"
            :aria-expanded="rangeOpen"
            :aria-controls="rangeListId"
            :aria-activedescendant="
              rangeOpen ? `${rangeListId}-${activeRangeIndex}` : undefined
            "
            @click="handleRangeClick"
            @keydown="handleRangeKeydown"
            @blur="rangeOpen = false"
          >
            {{ selectedRange.label }}
            <span class="range-chevron" aria-hidden="true" />
          </button>
          <ul
            v-show="rangeOpen"
            :id="rangeListId"
            ref="rangeList"
            class="range-list"
            role="listbox"
            aria-label="时间范围"
          >
            <li
              v-for="({ value, label }, index) in timeRanges"
              :id="`${rangeListId}-${index}`"
              :key="value"
              class="range-option"
              :class="{ 'is-active': index === activeRangeIndex }"
              role="option"
              :aria-selected="value === timeRange"
              @pointerenter="activeRangeIndex = index"
              @mousedown.prevent
              @click="selectRange(index)"
            >
              {{ label }}
            </li>
          </ul>
        </div>
        <button
          class="theme-button"
          type="button"
          :aria-label="themeLabel"
          :title="themeLabel"
          @click="$emit('toggle-theme')"
        >
          <span class="theme-icon" :class="{ sun: dark }" aria-hidden="true" />
        </button>
      </div>
    </header>
    <main class="page-viewport">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.workspace {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
}

.content-header {
  display: flex;
  min-height: 56px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 18px;
  padding-left: 22px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.content-header h1 {
  font-size: 18px;
  font-weight: 500;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.time-range {
  --range-focus: #80aaff;
  --range-chevron: #8090a9;
  --range-highlight: #767676;
  position: relative;
  width: clamp(128px, 45vw, 164px);
}

.time-range:where([data-theme="dark"] *) {
  --range-focus: #9bbcff;
  --range-chevron: #a2aec2;
  --range-highlight: #595969;
}

.range-trigger {
  display: flex;
  width: 100%;
  height: 33px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-inline: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 13px;
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
  text-align: start;
  cursor: pointer;
}

.range-trigger:hover,
.range-trigger:focus-visible,
.range-trigger[aria-expanded="true"] {
  border-color: var(--range-focus);
}

.range-trigger:focus-visible {
  outline-color: var(--range-focus);
}

.range-chevron {
  width: 8px;
  height: 8px;
  flex: none;
  margin-block-start: -4px;
  border-inline-end: 2px solid var(--range-chevron);
  border-block-end: 2px solid var(--range-chevron);
  border-end-end-radius: 1px;
  transform: rotate(45deg);
}

.range-list {
  position: absolute;
  z-index: 1;
  inset-block-start: calc(100% + 4px);
  inset-inline: 0;
  max-height: min(280px, calc(100dvh - 60px));
  margin: 0;
  padding: 0;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 5px;
  background: var(--elevated);
  list-style: none;
}

.range-option {
  padding: 3px 12px;
  font-size: 13px;
  line-height: 18px;
  cursor: pointer;
  transition: none;
}

.range-option.is-active {
  background: var(--range-highlight);
  color: #fff;
}

.theme-button {
  display: grid;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--accent);
  cursor: pointer;
}

.theme-button:hover {
  background: var(--hover);
  color: var(--accent-hover);
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

.page-viewport {
  flex: 1;
  padding: clamp(16px, 3vw, 32px);
}
</style>
