import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icons.svg',
        'favicon.svg',
        'Logo.png',
        'Logo-removebg-preview.png',
      ],
      manifest: {
        name: 'GUILD',
        short_name: 'GUILD',
        start_url: '/',
        display: 'standalone',
        background_color: '#0c0a07',
        theme_color: '#0c0a07',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        globIgnores: ['**/node_modules/**/*'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/api/,
          /^\/uploads/,
          /\.(?:png|jpg|jpeg|gif|webp|svg|mp4|webm)$/,
        ],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.origin === self.location.origin &&
              (url.pathname.startsWith('/api/leaderboards/') ||
                url.pathname.startsWith('/api/ff/')),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'guild-public-api',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 300,
              },
              plugins: [
                {
                  cacheWillUpdate: async ({ response }) => {
                    if (!response || (response.status !== 200 && response.status !== 0)) return null;
                    const ct = response.headers.get('content-type') || '';
                    return ct.includes('application/json') ? response : null;
                  },
                },
              ],
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
