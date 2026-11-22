<script setup>
import { sections } from "../analytics/sections.js";

defineProps({ active: String });
defineEmits(["select"]);
</script>

<template>
  <nav aria-label="统计导航" class="nav">
    <button
      v-for="{ id, title, icon } in sections"
      :key="id"
      type="button"
      :aria-current="active === id ? 'page' : undefined"
      @click="$emit('select', id)"
    >
      <component :is="icon" aria-hidden="true" />
      {{ title }}
    </button>
  </nav>
</template>

<style scoped>
.nav {
  display: grid;
  align-content: start;
  gap: 4px;
  padding: 16px 12px;
}

.nav button {
  display: flex;
  min-height: 42px;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--muted);
  text-align: left;
  cursor: pointer;
}

.nav button:hover {
  background: var(--hover);
  color: var(--text);
}

.nav button[aria-current] {
  background: var(--selected);
  color: var(--accent-active);
  font-weight: 600;
}

.nav :deep(.anticon) {
  font-size: 16px;
}
</style>
