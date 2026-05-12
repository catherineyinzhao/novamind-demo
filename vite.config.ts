import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Proxies to the Express API (`tsx watch server/index.ts`). Default PORT=8787 — keep in sync with server/index.ts / .env.
// Use `npm run dev` (not `dev:web` alone) so the API is up before Vite proxies `/api/*`.
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
