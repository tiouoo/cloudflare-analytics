<script setup>
import { useId } from "vue";
import ASelect from "ant-design-vue/es/select";

defineProps({
  label: { type: String, required: true },
  options: { type: Array, required: true },
});
const value = defineModel({ type: String, required: true });
const id = useId();
</script>

<template>
  <label :for="id" class="sr-only">{{ label }}</label>
  <ASelect :id="id" v-model:value="value" class="dashboard-picker" popup-class-name="dashboard-picker-popup"
    :options="options" :virtual="false">
    <template #suffixIcon><span class="picker-chevron" aria-hidden="true" /></template>
  </ASelect>
</template>
