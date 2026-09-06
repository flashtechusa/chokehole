import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath, URL } from 'node:url';

/**
 * Standalone build: the whole game as ONE self-contained .html file.
 *
 * Possible only because nothing in this game loads an external asset — every
 * wrestler, arena and sound is generated at runtime — so there is nothing left
 * to fetch once the JS is inlined. Open the file, play. No server, no install.
 *
 *   npm run build:single   ->   dist-single/CHOKE-HOLE.html
 *
 * The PWA service worker is deliberately omitted: it needs a real origin and
 * does nothing from file://. Use `npm run build` for the deployable version.
 */
export default defineConfig({
  base: './',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2020',
    outDir: 'dist-single',
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    reportCompressedSize: false,
    rollupOptions: {
      input: fileURLToPath(new URL('./single.html', import.meta.url)),
      output: { inlineDynamicImports: true },
    },
  },
  plugins: [viteSingleFile({ removeViteModuleLoader: true })],
});
