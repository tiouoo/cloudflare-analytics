<script setup>
import { computed, nextTick, ref, useId } from "vue";
import { timeRanges } from "../../analytics/ranges.js";

const timeRange = defineModel({ type: String, required: true });

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
</template>

<style scoped>
.time-range {
  --range-focus: #80aaff;
  --range-chevron: #8090a9;
  --range-highlight: #767676;
  position: relative;
  width: clamp(112px, 22vw, 148px);
}

.time-range:where([data-theme="dark"] *) {
  --range-focus: #9bbcff;
  --range-chevron: #a2aec2;
  --range-highlight: #595969;
}

.range-trigger {
  display: flex;
  width: 100%;
  height: 36px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-inline: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
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
  z-index: 3;
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
</style>
