<script setup>
import { computed, ref } from "vue";
import { formatNumber } from "../analytics/panels.js";

const props = defineProps({
  rows: { type: Array, required: true },
  dimension: { type: String, required: true },
  measure: { type: String, default: "请求数" },
  label: Function,
  errors: Boolean,
  ranked: Boolean,
  total: Number,
});
const expanded = ref(false);
const limit = computed(() => props.ranked ? 8 : 6);
const shown = computed(() => expanded.value ? props.rows : props.rows.slice(0, limit.value));
const scale = computed(() => Math.max(1, props.total ?? 0, ...props.rows.map(({ value }) => value)));
const display = (name) => (props.label ? props.label(name) : name) || "未知";
</script>

<template>
  <p v-if="!rows.length" class="panel-message">所选时间内暂无数据</p>
  <template v-else>
    <table class="breakdown" :class="{ 'breakdown-ranked': ranked }">
      <thead :class="{ 'sr-only': ranked }">
        <tr><th scope="col">{{ dimension }}</th><th v-if="ranked" scope="col">相对数量</th><th scope="col">{{ measure }}</th><th v-if="errors" scope="col">错误数</th></tr>
      </thead>
      <tbody>
        <tr v-for="{ label: name, value, errors: count } in shown" :key="name">
          <th scope="row">
            <span :class="ranked ? 'ranking-label' : 'breakdown-bar'" :title="ranked ? String(display(name)) : undefined"
              :style="ranked ? undefined : { '--bar-width': 100 * value / scale + '%' }">
              {{ display(name) }}
            </span>
          </th>
          <td v-if="ranked" aria-hidden="true" class="ranking-bar-cell">
            <span class="ranking-track"><span :style="{ width: 100 * value / scale + '%' }" /></span>
          </td>
          <td>{{ formatNumber(value) }}</td>
          <td v-if="errors">{{ formatNumber(count) }}</td>
        </tr>
      </tbody>
    </table>
    <button v-if="rows.length > limit" type="button" class="text-button" :aria-expanded="expanded" @click="expanded = !expanded">
      {{ expanded ? "收起" : "查看全部 " + rows.length + " 项" }}
    </button>
  </template>
</template>
