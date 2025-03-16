import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://server:5000',  // Use Docker service name instead of localhost
        changeOrigin: true,
        // Uncomment if you need path rewriting
        // rewrite: (path) => path.replace(/^\/api/, '')
      },
    },
  }
})