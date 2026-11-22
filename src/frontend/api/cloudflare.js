import { request } from "./request.js";

export function queryCloudflare(endpoint, { account, zone, range, signal } = {}) {
  const params = new URLSearchParams();
  if (zone) params.set("zone", zone);
  if (range) params.set("range", range);

  const query = params.size ? "?" + params : "";
  return request("/cloudflare/" + endpoint + query, {
    signal,
    headers: account
      ? {
          "X-Cloudflare-Account-Id": account.id,
          Authorization: "Bearer " + account.token,
        }
      : undefined,
  });
}
