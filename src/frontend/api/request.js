export async function request(path, { method = 'GET', body, signal, headers } = {}) {
  const requestHeaders = new Headers(headers);
  if (body !== undefined) requestHeaders.set('Content-Type', 'application/json');
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      signal,
      headers: requestHeaders,
      credentials: 'same-origin',
      cache: 'no-store',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('无法连接服务器, 请稍后重试');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.message || '请求失败, 请重试');
    error.status = response.status;
    throw error;
  }
  if (!data) throw new Error('服务器响应无效, 请稍后重试');
  return data;
}
