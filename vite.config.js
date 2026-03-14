import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Proxy removed since we connect securely to Supabase externally
    host: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'marlee-nonempathic-kent.ngrok-free.dev',
      'all'
    ]
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['node-cron']
  },
  build: {
    rollupOptions: {
      external: ['node-cron']
    }
  }
});

