import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { getRequestListener } from '@hono/node-server';
import app from './src/backend/api.js';

function apiMiddleware(loadApp) {
  return async (request, response, next) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname !== '/api' && !pathname.startsWith('/api/')) return next();

    try {
      const backend = await loadApp();
      await getRequestListener(backend.fetch)(request, response);
    } catch (error) {
      next(error);
    }
  };
}

function loadBackendEnv({ mode, envDir }) {
  const localEnv = loadEnv(mode, envDir, 'CLOUDFLARE_');
  for (const key of ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_VISIBLE_DOMAINS']) {
    if (localEnv[key]) process.env[key] ??= localEnv[key];
  }
}

function backendPlugin() {
  return {
    name: 'hono-backend',
    configureServer(server) {
      loadBackendEnv(server.config);

      server.middlewares.use(apiMiddleware(async () => {
        const module = await server.ssrLoadModule('/src/backend/api.js');
        return module.default;
      }));
    },
    configurePreviewServer(server) {
      loadBackendEnv(server.config);
      server.middlewares.use(apiMiddleware(async () => app));
    },
  };
}

export default defineConfig({
  resolve: { dedupe: ['vue', 'vue-router'] },
  plugins: [vue(), backendPlugin()],
});
