import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        // En Docker: 'http://backend:8000'
        // Local sin Docker: 'http://localhost:8000'
        target: 'http://backend:8000',
        changeOrigin: true,
      },
    },
  },
})
