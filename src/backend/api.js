import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import cloudflareRoutes from './routes/cloudflare.js';
import healthRoutes from './routes/health.js';

const app = new Hono().basePath('/api');

app.route('/', healthRoutes);
app.route('/cloudflare', cloudflareRoutes);
app.notFound((context) => context.json({ message: '接口不存在' }, 404));
app.onError((error, context) => {
  if (error instanceof HTTPException) {
    return context.json({ message: error.message }, error.status);
  }
  return context.json({ message: '服务器暂时无法处理此请求，请重试。' }, 500);
});

export default app;
