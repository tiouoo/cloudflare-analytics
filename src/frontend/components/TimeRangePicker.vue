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
      class="picker-trigger range-trigger"
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
      <span class="picker-chevron" aria-hidden="true" />
    </button>
    <ul
      v-show="rangeOpen"
      :id="rangeListId"
      ref="rangeList"
      class="picker-popup range-list"
      role="listbox"
      aria-label="时间范围"
    >
      <li
        v-for="({ value, label }, index) in timeRanges"
        :id="`${rangeListId}-${index}`"
        :key="value"
        class="picker-option range-option"
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
  position: relative;
  width: clamp(112px, 22vw, 148px);
}

.range-trigger {
  width: 100%;
}

.range-list {
  position: absolute;
  z-index: 3;
  inset-block-start: calc(100% + 4px);
  inset-inline: 0;
  max-height: min(280px, calc(100dvh - 60px));
  margin: 0;
  overflow: auto;
  list-style: none;
}

.range-option {
  cursor: pointer;
}
</style>
