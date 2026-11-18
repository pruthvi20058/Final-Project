import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Use '/' for Vercel/Netlify; './' is kept for local preview compatibility
  base: '/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    // Suppress large chunk warning (acceptable for this monolithic SPA)
    chunkSizeWarningLimit: 1000
  }
});
