import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api/lms': { target: 'http://localhost:3001', changeOrigin: true },'/api': { target: 'http://localhost:3000', changeOrigin: true } } },
  build: {
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


