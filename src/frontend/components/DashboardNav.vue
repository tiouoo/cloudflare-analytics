<script setup>
import { nextTick, useTemplateRef, watch } from "vue";
import { AppstoreOutlined, GlobalOutlined } from "@ant-design/icons-vue";

const props = defineProps({
  groups: { type: Array, required: true },
  active: String,
  activeGroup: String,
});
const emit = defineEmits(["navigate"]);
const nav = useTemplateRef("nav");

watch(
  () => props.active,
  async () => {
    await nextTick();
    const link = nav.value?.querySelector("[aria-current]");
    if (!link || !nav.value.clientHeight) return;
    const container = nav.value.getBoundingClientRect();
    const item = link.getBoundingClientRect();
    if (item.bottom > container.bottom)
      nav.value.scrollTop += item.bottom - container.bottom + 8;
    if (item.top < container.top)
      nav.value.scrollTop -= container.top - item.top + 8;
  },
);
</script>

<template>
  <nav ref="nav" class="dashboard-nav" aria-label="本页目录">
    <!-- <p class="nav-label">本页目录</p> -->
    <ul class="anchor-groups">
      <li v-for="group in groups" :key="group.id">
        <a
          class="group-link"
          :class="{ 'active-group': activeGroup === group.id }"
          :href="'#' + group.id"
          :aria-current="active === group.id ? 'location' : undefined"
          @click="emit('navigate')"
        >
          <AppstoreOutlined v-if="group.id === 'overview'" aria-hidden="true" />
          <GlobalOutlined v-else aria-hidden="true" />
          <span>{{ group.title }}</span>
        </a>
        <ul v-if="activeGroup === group.id" class="anchor-children">
          <li v-for="section in group.sections" :key="section.id">
            <a
              :href="'#' + section.id"
              :aria-current="active === section.id ? 'location' : undefined"
              @click="emit('navigate')"
            >
              <component :is="section.icon" aria-hidden="true" />
              {{ section.title }}
            </a>
          </li>
        </ul>
      </li>
    </ul>
  </nav>
</template>
