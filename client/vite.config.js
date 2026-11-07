import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/*
 * Preview-only host allowlist. The sandbox serves the app through a rotating
 * hostname, so the extra host is added only when BASE44_PREVIEW_MODE is exactly
 * "1" and the sandbox domain variable is present. Outside the preview (or with
 * the variable unset) the list stays exactly as the project defines it.
 */
const previewMode = process.env.BASE44_PREVIEW_MODE === '1';
const sandboxDomain = process.env.BASE44_SANDBOX_HOST_DOMAIN;
const allowedHosts =
  previewMode && sandboxDomain ? [`.${sandboxDomain}`] : undefined;

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    ...(allowedHosts ? { allowedHosts } : {}),
    watch: { usePolling: true, interval: 300 },
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET || 'http://api:8000',
        changeOrigin: false,
      },
    },
  },
  build: { outDir: 'dist', sourcemap: false },
});
