# Cloudflare Analytics

Vue 3 仪表板通过 Vercel 上的 Hono API 读取 Cloudflare Analytics。统计结果在当前页面会话的浏览器内存中缓存 60 秒，可在页面中清除。每个统计模块可单独刷新。

## 本地运行

~~~sh
npm ci
npm run dev
~~~

本地启动进程或 Vercel 项目设置使用以下服务端环境变量。

| 环境变量 | 用途 |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | 默认账户的 Account ID |
| `CLOUDFLARE_API_TOKEN` | 默认账户的 Cloudflare API Token |

Cloudflare Token 需要目标站点的 **Zone Read** 和 **Analytics Read** 权限。读取 Workers 时还需要目标账户的 **Account Analytics Read**。权限与历史窗口取决于 Cloudflare 套餐和数据集。“所有时间”查询该模块可单次请求的最长时间窗口。

首页使用默认账户。通过标题栏的“添加账户”进入 `/{accountId}/{token}` 后，页面使用该路径中的自定义凭据。自定义路径包含 Token，浏览器历史和直接访问时的服务日志可能记录该路径。
