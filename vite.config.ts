import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 4000,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      filename: 'sw.js',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp}'],
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
      },
      manifest: {
        name: 'CHOKE HOLE: NO HOLES BARRED',
        short_name: 'CHOKE HOLE',
        description: 'Extreme Drag Wrestling. An I.B.S. broadcast.',
        start_url: '.',
        scope: '.',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#0B0611',
        theme_color: '#0B0611',
        icons: [
          { src: 'assets/branding/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'assets/branding/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
});
