import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { identifierPattern } from "../../analytics/credentials.js";
import { bucketForDuration, timeRanges } from "../../analytics/ranges.js";
import { accountCredentials, createCloudflareClient } from "../cloudflare/client.js";
import { metrics } from "../cloudflare/metrics.js";

const routes = new Hono();

routes.use("*", async (context, next) => {
  context.header("Cache-Control", "private, no-store");
  const { accountId, token } = accountCredentials(context);
  context.set("accountId", accountId);
  context.set("cloudflare", createCloudflareClient(token, context.req.raw.signal));
  await next();
});

routes.get("/zones", async (context) => {
  const zones = await context.get("cloudflare").listZones(context.get("accountId"));
  return context.json({ zones });
});

routes.get("/:metric", async (context) => {
  const name = context.req.param("metric");
  if (!Object.hasOwn(metrics, name)) {
    throw new HTTPException(404, { message: "此指标不存在。" });
  }

  const {
    dataset,
    scope = "zones",
    limit = 1,
    order: defaultOrder,
    filter,
    series,
    format,
    fields,
  } = metrics[name];
  const selectedRange = timeRanges.find(({ value }) => value === context.req.query("range"));
  if (!selectedRange) {
    throw new HTTPException(400, { message: "请选择有效的时间范围。" });
  }

  const cloudflare = context.get("cloudflare");
  const accountId = context.get("accountId");
  const id = scope === "accounts" ? accountId : context.req.query("zone");
  if (scope === "zones") {
    if (!id || !identifierPattern.test(id)) {
      throw new HTTPException(400, { message: "请选择有效的站点。" });
    }
    await cloudflare.assertZoneAccess(id, accountId);
  }

  let { duration, bucket } = selectedRange;
  let pageSize = series ? 400 : limit;
  if (!duration) {
    const { settings } = await cloudflare.queryScope(
      scope,
      id,
      `settings { ${dataset} { enabled maxDuration notOlderThan maxPageSize } }`,
    );
    const availability = settings?.[dataset];
    if (!availability?.enabled) {
      throw new HTTPException(403, { message: "当前账户的套餐或权限未提供此指标。" });
    }
    const seconds = Math.min(availability.maxDuration, availability.notOlderThan);
    if (!(seconds > 0)) {
      throw new HTTPException(422, { message: "Cloudflare 未提供此指标的可查询历史范围。" });
    }
    duration = Math.max(1, seconds - 5) * 1000;
    bucket = bucketForDuration(duration);
    pageSize = Math.min(pageSize, availability.maxPageSize || pageSize);
  }

  const now = Date.now();
  const from = new Date(now - duration).toISOString();
  const to = new Date(now).toISOString();
  const order = series ? [bucket + "_ASC"] : defaultOrder;
  const orderArg = order ? `, orderBy: [${order.join(", ")}]` : "";
  const extraFilter = filter ? ", " + filter : "";
  const data = await cloudflare.queryScope(
    scope,
    id,
    `rows: ${dataset}(
      limit: ${pageSize}${orderArg},
      filter: { datetime_geq: $from, datetime_leq: $to${extraFilter} }
    ) { ${series ? fields(bucket) : fields} }`,
    { from, to },
  );

  return context.json({
    data: format(data.rows, bucket),
    from,
    to,
    ...(series ? { bucket } : {}),
  });
});

export default routes;
