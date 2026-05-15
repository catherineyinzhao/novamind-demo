import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

/** Markdown is imported with `?raw`; a full reload avoids stale chunks in dev when editing the brief. */
function mdContentFullReload(): Plugin {
  return {
    name: 'md-content-full-reload',
    handleHotUpdate({ file, server }) {
      if (file.includes('src/content/') && file.endsWith('.md')) {
        server.ws.send({ type: 'full-reload' })
        return []
      }
    },
  }
}

// Proxies to the Express API (`tsx watch server/index.ts`). Default PORT=8787 — keep in sync with server/index.ts / .env.
// Use `npm run dev` (not `dev:web` alone) so the API is up before `/api/*` proxies work.
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), mdContentFullReload()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
