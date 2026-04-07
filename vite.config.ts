import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3333',
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            // Server not ready yet — return 503 instead of crashing the proxy
            try {
              if (!res.headersSent) {
                (res as import('http').ServerResponse).writeHead(503, { 'Content-Type': 'application/json' })
              }
              res.end(JSON.stringify({ error: 'server_starting' }))
            } catch { /* ignore */ }
          })
        },
      },
    },
  },
})
