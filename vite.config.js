import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  const origin = env.VITE_API_ORIGIN?.trim();

  if (env.VERCEL && !origin) {
    throw new Error('Set VITE_API_ORIGIN in Vercel to your hosted FastAPI HTTPS origin before deploying.');
  }

  if (origin) {
    const url = new URL(origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
      throw new Error('VITE_API_ORIGIN must be an origin such as https://api.example.com, without /api, credentials, query or fragment.');
    }
    if (env.VERCEL && url.protocol !== 'https:') {
      throw new Error('Vercel deployments require an HTTPS backend origin.');
    }
  }

  return {
    server: { proxy: { '/api': 'http://127.0.0.1:8000' } },
  };
});
