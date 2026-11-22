import { HTTPException } from "hono/http-exception";

const dimensions = {
  ports: { field: "ClientSrcPort", condition: "ClientSrcPort > 0" },
  regions: { field: "ClientRegionCode", condition: "ClientRegionCode != ''" },
};

export function loadLogRankings(cloudflare, zoneId, range, now) {
  const from = new Date(now - range.duration).toISOString();
  const to = new Date(now).toISOString();
  return Promise.all(Object.entries(dimensions).map(async ([key, { field, condition }]) => {
    try {
      const rows = await cloudflare.queryHttpLogs(zoneId,
        `SELECT ${field} AS label, COUNT(*) AS requests FROM http_requests
        WHERE Date >= '${from.slice(0, 10)}' AND Date <= '${to.slice(0, 10)}'
          AND EdgeStartTimestamp >= '${from}' AND EdgeStartTimestamp < '${to}' AND ${condition}
        GROUP BY ${field} ORDER BY requests DESC LIMIT 20`);
      const data = rows.map(({ label, requests }) => ({ label: String(label), value: Number(requests) }));
      return [key, { data, from, to }];
    } catch (error) {
      if (!(error instanceof HTTPException)) throw error;
      const message = error.status === 403 || error.status === 404
        ? "需要为此站点启用 Log Explorer HTTP 请求日志，并使用具备 Logs Read 权限的 API Token。"
        : error.message;
      return [key, { error: message }];
    }
  }));
}
