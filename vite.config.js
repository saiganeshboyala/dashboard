import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/scraper-api': { target: 'http://localhost:8000', changeOrigin: true, rewrite: (path) => path.replace(/^\/scraper-api/, '/api/v1') }, '/api/lms': { target: 'http://localhost:3001', changeOrigin: true },'/api': { target: 'http://localhost:3000', changeOrigin: true } } },
  build: {
    sourcemap: false, // never expose source in production
    chunkSizeWarningLimit: 600, // recharts bundles d3 internally (~542 kB); expected
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':   ['react', 'react-dom', 'react-router-dom'],
          'vendor-lucide':  ['lucide-react'],
          'vendor-recharts':['recharts'],
        },
      },
    },
  },
})


