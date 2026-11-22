import { onScopeDispose, ref, shallowRef, watch } from "vue";

export function useResource(dependencies, fetchData, ready = ref(true)) {
  const result = shallowRef(null);
  const error = ref("");
  const loading = ref(false);
  let needsLoad = true;
  let request;

  watch(dependencies, () => {
    request?.abort();
    needsLoad = true;
    result.value = null;
    error.value = "";
    loading.value = false;
  }, { flush: "sync" });

  watch([...dependencies, ready], async () => {
    if (!ready.value || !needsLoad) return;
    const controller = new AbortController();
    request = controller;
    needsLoad = false;
    loading.value = true;
    try {
      const data = await fetchData(controller.signal);
      if (!controller.signal.aborted) result.value = data;
    } catch (failure) {
      if (!controller.signal.aborted) error.value = failure.message;
    } finally {
      if (!controller.signal.aborted) loading.value = false;
    }
  }, { immediate: true });

  onScopeDispose(() => request?.abort());
  return { result, loading, error };
}
