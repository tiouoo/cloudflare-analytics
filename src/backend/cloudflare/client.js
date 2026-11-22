import { HTTPException } from "hono/http-exception";
import { identifierPattern, tokenPattern } from "../../analytics/credentials.js";

export function accountCredentials(context) {
  const accountId = context.req.header("X-Cloudflare-Account-Id");
  const authorization = context.req.header("Authorization");

  if (accountId === undefined && authorization === undefined) {
    const defaultId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
    const defaultToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
    if (!defaultId || !defaultToken) {
      throw new HTTPException(503, { message: "默认账户尚未配置，可添加自己的账户。" });
    }
    return { accountId: defaultId, token: defaultToken };
  }

  const token = authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!accountId || !token || !identifierPattern.test(accountId) || !tokenPattern.test(token)) {
    throw new HTTPException(400, { message: "请输入有效的 Account ID 和 API Token。" });
  }
  return { accountId, token };
}

export function createCloudflareClient(token, requestSignal) {
  const signal = AbortSignal.any([requestSignal, AbortSignal.timeout(18_000)]);

  async function send(path, body) {
    let response;
    try {
      response = await fetch("https://api.cloudflare.com/client/v4" + path, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Authorization: "Bearer " + token,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
        signal,
      });
    } catch {
      throw new HTTPException(504, { message: "连接 Cloudflare 超时或失败，请重试。" });
    }

    const payload = await response.json().catch(() => null);
    if (response.ok && payload && payload.success !== false && !payload.errors?.length) {
      return payload;
    }

    const details = payload?.errors?.[0]?.message ?? "";
    const code = payload?.errors?.[0]?.code;
    if (response.status === 429 || /rate limit/i.test(details)) {
      throw new HTTPException(429, { message: "Cloudflare 请求频率已达上限，请稍后刷新。" });
    }
    if (/time range|notOlderThan|too old|maxDuration|date range|older than|query time limit|query duration/i.test(details)) {
      throw new HTTPException(422, { message: "所选范围超出 Cloudflare 对此指标提供的历史范围。" });
    }
    if (response.status === 401 || response.status === 403 || code === 10000 ||
        /authenticat|access denied|permission|not entitled|not enabled|not available/i.test(details)) {
      throw new HTTPException(403, { message: "读取权限不足，或当前 Cloudflare 套餐未提供此数据。" });
    }
    if (response.status === 404) {
      throw new HTTPException(404, { message: "Cloudflare 资源不存在或不可访问。" });
    }
    throw new HTTPException(502, { message: "Cloudflare 暂时无法返回此指标，请重试。" });
  }

  return {
    async listZones(accountId) {
      const zones = [];
      let page = 1;
      let totalPages;
      do {
        const params = new URLSearchParams({
          "account.id": accountId,
          per_page: "50",
          page: String(page),
          order: "name",
        });
        const result = await send("/zones?" + params);
        for (const { id, name, status, account } of result.result) {
          if (account?.id?.toLowerCase() === accountId.toLowerCase()) {
            zones.push({ id, name, status });
          }
        }
        totalPages = result.result_info?.total_pages ?? 1;
        page += 1;
      } while (page <= totalPages);
      return zones;
    },

    async assertZoneAccess(zoneId, accountId) {
      const { result } = await send("/zones/" + zoneId);
      if (result?.account?.id?.toLowerCase() !== accountId.toLowerCase()) {
        throw new HTTPException(404, { message: "当前账户无法访问此站点。" });
      }
    },

    async queryScope(scope, id, fields, bounds) {
      const tag = scope === "zones" ? "zoneTag" : "accountTag";
      const timeVariables = bounds ? ", $from: Time!, $to: Time!" : "";
      const query = `query Analytics($id: string!${timeVariables}) {
        viewer {
          ${scope}(filter: { ${tag}: $id }) {
            ${fields}
          }
        }
      }`;
      const { data } = await send("/graphql", {
        query,
        variables: { id, ...bounds },
      });
      const result = data?.viewer?.[scope]?.[0];
      if (!result) {
        throw new HTTPException(403, { message: "此账户或站点的 Analytics 数据不可用。" });
      }
      return result;
    },
  };
}
