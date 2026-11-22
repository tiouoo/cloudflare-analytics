<script setup>
import { computed, ref } from "vue";
import { formatNumber } from "../analytics/panels.js";

const props = defineProps({
  rows: { type: Array, required: true },
  dimension: { type: String, required: true },
  measure: { type: String, default: "请求数" },
  label: Function,
  errors: Boolean,
});
const expanded = ref(false);
const shown = computed(() => expanded.value ? props.rows : props.rows.slice(0, 6));
const largest = computed(() => Math.max(1, ...props.rows.map(({ value }) => value)));
</script>

<template>
  <p v-if="!rows.length" class="panel-message">所选时间内暂无数据</p>
  <template v-else>
    <table class="breakdown">
      <thead>
        <tr><th scope="col">{{ dimension }}</th><th scope="col">{{ measure }}</th><th v-if="errors" scope="col">错误数</th></tr>
      </thead>
      <tbody>
        <tr v-for="{ label: name, value, errors: count } in shown" :key="name">
          <th scope="row">
            <span class="breakdown-bar" :style="{ '--bar-width': 100 * value / largest + '%' }">
              {{ (label ? label(name) : name) || "未知" }}
            </span>
          </th>
          <td>{{ formatNumber(value) }}</td>
          <td v-if="errors">{{ formatNumber(count) }}</td>
        </tr>
      </tbody>
    </table>
    <button v-if="rows.length > 6" type="button" class="text-button" :aria-expanded="expanded" @click="expanded = !expanded">
      {{ expanded ? "收起" : "查看全部 " + rows.length + " 项" }}
    </button>
  </template>
</template>
