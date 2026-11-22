# Cloudflare Analytics

使用 Vue 3、Chart.js 和 Hono 搭建的单页 Cloudflare 分析仪表盘。首页展示账户级 HTTP 请求、响应流量、错误率、状态码、HTTP 版本、缓存命中率、DNS、安全事件、访问与地区、网络性能和产品统计。各个站点按域名单独列在账户概览下方。左侧目录随页面滚动高亮，链接可直接定位到相应指标。

账户概览通过 Cloudflare GraphQL 的 `accounts` 作用域查询。站点列表来自 Cloudflare REST API，站点数据通过 GraphQL 的 `zones` 作用域查询，并在相应站点进入视野附近时加载。打开页面或切换时间范围时按需向 Cloudflare 查询，分析响应使用 `Cache-Control: private, no-store`。

## 本地运行

将 `.env.example` 复制为项目根目录的 `.env`，填写默认账户的 Account ID 和 API Token。

~~~dotenv
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_VISIBLE_DOMAINS=
~~~

~~~sh
npm ci
npm run dev
~~~

部署到 Vercel 时，在项目设置中配置同名的服务端环境变量。修改本地 `.env` 后重启开发服务器。`.env` 已被 Git 忽略。

填写 `CLOUDFLARE_VISIBLE_DOMAINS=example.com,example.net` 可在目录和正文中仅显示列出的 Cloudflare 站点。域名完整匹配，忽略大小写和逗号两边的空格。留空时显示当前账户下所有可访问的站点。概览统计始终涵盖整个账户。

## Cloudflare API 权限

1. 打开 Cloudflare 控制台的 **My Profile → API Tokens**，选择 **Create Token → Create Custom Token**。[API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. 添加 **Account → Account Analytics → Read**、**Zone → Zone → Read**、**Zone → Analytics → Read**，并将资源范围设为所需的账户和站点。[Cloudflare 权限说明](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)
3. 将 Token 和账户 ID 分别填入服务端环境变量。[查找 Account ID](https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/)

各数据集的访问权限和历史窗口取决于 Cloudflare 套餐及 Token。超过可查询范围时，模块会注明实际统计区间。“所有时间”读取每个数据集可单次查询的最长区间。

## 通过 URL 访问其他账户

首页使用默认账户。直接访问 `/{accountId}/{token}` 可进入其他账户的同一仪表盘，例如使用 `/{accountId}/{token}#overview-cache` 定位到账户缓存命中率。该路径包含 Token，浏览器历史和部署端访问日志可能记录它。
