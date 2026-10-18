import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  const disableHmr = process.env.DISABLE_HMR === 'true';

  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || process.cwd(), '.'),
      },
    },

    server: {
      // Akses Vite dari perangkat lain di jaringan lokal.
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      allowedHosts: ['192.168.3.188'],

      // Teruskan permintaan API dari frontend (5173) ke Express (3000).
      // Tanpa proxy ini, /api/* dikirim ke Vite dan menghasilkan 404.
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
      },

      // Pertahankan perilaku HMR/file watcher sebelumnya.
      hmr: !disableHmr,
      watch: disableHmr ? null : {},
    },
  };
});
