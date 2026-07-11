import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { zdReleasePlugin } from './scripts/vite-version-plugin.mjs';

export default defineConfig({
  plugins: [react(), zdReleasePlugin()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          const norm = id.replace(/\\/g, '/');
          if (norm.includes('recharts')) return 'charts';
          if (norm.includes('@supabase')) return 'supabase';
          if (norm.includes('@tanstack')) return 'query';
          if (norm.includes('react-router')) return 'router';
          if (norm.includes('lucide-react')) return 'icons';
          // React + scheduler même chunk — évite écran noir (react ↔ vendor)
          if (
            norm.includes('/react-dom/')
            || norm.includes('/react/')
            || norm.includes('/scheduler/')
            || norm.includes('/use-sync-external-store/')
          ) {
            return 'react';
          }
          return 'vendor';
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
