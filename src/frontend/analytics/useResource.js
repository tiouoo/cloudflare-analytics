import { onScopeDispose, ref, shallowRef, watch } from "vue";

const ttl = 60_000;

export function useResource(cache, key, fetchData) {
  const result = shallowRef(null);
  const loading = ref(false);
  const error = ref("");
  const cached = ref(false);
  let controller;

  async function load(force = false) {
    controller?.abort();
    const records = cache.value;
    const resourceKey = key.value;
    error.value = "";
    loading.value = false;
    if (!resourceKey) return;

    const now = Date.now();
    for (const [recordKey, record] of records) {
      if (now - record.updatedAt >= ttl) records.delete(recordKey);
    }
    const saved = records.get(resourceKey);
    if (!force && saved) {
      result.value = saved;
      cached.value = true;
      return;
    }

    const request = new AbortController();
    controller = request;
    loading.value = true;
    try {
      const data = await fetchData(request.signal);
      if (request.signal.aborted) return;

      const record = { data, updatedAt: Date.now() };
      records.set(resourceKey, record);
      result.value = record;
      cached.value = false;
    } catch (failure) {
      if (!request.signal.aborted) error.value = failure.message;
    } finally {
      if (!request.signal.aborted) loading.value = false;
    }
  }

  watch([cache, key], () => {
    result.value = null;
    cached.value = false;
    load();
  }, { immediate: true });
  onScopeDispose(() => controller?.abort());

  return { result, loading, error, cached, refresh: () => load(true) };
}
