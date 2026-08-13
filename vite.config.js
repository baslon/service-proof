import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        // index.html is prerendered (scripts/prerender.mjs) so the "/" route
        // has real content in its initial HTML. app.html is the plain,
        // empty-shell SPA fallback every other route serves — kept separate
        // so a prerendered Landing page never gets served under e.g.
        // /dashboard, where it would mismatch on hydration.
        main: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app.html'),
      },
    },
  },
})
