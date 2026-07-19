import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Lets the dev server (and anything tunneled to it, e.g. ngrok) reach the
    // backend as a same-origin relative path - avoids needing a second public
    // tunnel for the API and sidesteps CORS entirely for that scenario.
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
    // Vite rejects requests whose Host header isn't recognized (anti DNS-
    // rebinding); an ngrok tunnel forwards the public hostname as-is, so it
    // needs to be allow-listed explicitly. Covers both current ngrok TLDs
    // since the free-tier subdomain changes on every restart.
    allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app'],
  },
})
