# Cloudflare Analytics

Vue 3 仪表板通过 Vercel 上的 Hono API 读取 Cloudflare Analytics。统计结果在当前页面会话的浏览器内存中缓存 60 秒，可在页面中清除。每个统计模块可单独刷新。

## 本地运行

将 `.env.example` 复制为项目根目录的 `.env`，填写默认账户的 Account ID 和 API Token。

~~~dotenv
CLOUDFLARE_ACCOUNT_ID=你的账户ID
CLOUDFLARE_API_TOKEN=你的APIToken
~~~

~~~sh
npm ci
npm run dev
~~~

修改 `.env` 后重启开发服务器。部署时，在 Vercel 项目设置中配置同名的服务端环境变量。

## 创建 Cloudflare API Token

1. 打开 Cloudflare 控制台的 **My Profile → API Tokens**，点击 **Create Token → Create Custom Token**。[API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. 添加 **Zone → Zone → Read**、**Zone → Analytics → Read**。需要查看 Workers 时，再添加 **Account → Account Analytics → Read**。将资源范围设为要查询的账户和站点。[Cloudflare 权限说明](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)
3. 确认创建并复制 Token。在 Cloudflare 账户首页的命令面板中搜索 **Copy account ID**，将两项分别填入 `.env`。[查找 Account ID](https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/)

权限与历史窗口取决于 Cloudflare 套餐和数据集。“所有时间”查询该模块可单次请求的最长时间窗口。

首页使用默认账户。通过标题栏的“添加账户”进入 `/{accountId}/{token}` 后，页面使用该路径中的自定义凭据。自定义路径包含 Token，浏览器历史和直接访问时的服务日志可能记录该路径。
