import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',  // Local development without Docker
        changeOrigin: true,
        // Uncomment if you need path rewriting
        // rewrite: (path) => path.replace(/^\/api/, '')
      },
    },
  }
})