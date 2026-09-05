import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// CHOKE HOLE: NO HOLES BARRED — build config.
// Static output; deployable to Netlify / Cloudflare Pages / Vercel (see docs/DEPLOYMENT.md).
export default defineConfig({
  base: './',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2020',
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: { phaser: ['phaser'] },
      },
    },
  },
  server: { host: true, port: 5173 },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['assets/branding/favicon.svg', 'assets/branding/icon-180.png'],
      manifest: {
        name: 'CHOKE HOLE: NO HOLES BARRED',
        short_name: 'CHOKE HOLE',
        description: 'Extreme Drag Wrestling. A mobile-first 2.5D arcade wrestling broadcast, interrupted by IBS.',
        theme_color: '#0a0410',
        background_color: '#0a0410',
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'landscape',
        start_url: './',
        scope: './',
        icons: [
          { src: 'assets/branding/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'assets/branding/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'assets/branding/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Intentionally limited cache set: core quick-match play works offline after first load.
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
});
