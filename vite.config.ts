import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 3000, // رفع حد التحذير ليستوعب حجم التطبيق المجمع
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (
                id.includes('jspdf') ||
                id.includes('html2canvas') ||
                id.includes('html-to-image')
              ) {
                return 'pdf-libs';
              }
              if (
                id.includes('react') ||
                id.includes('lucide-react')
              ) {
                return 'vendor';
              }
              if (id.includes('qrcode') || id.includes('canvas')) {
                return 'qr-libs';
              }
            }
          },
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});