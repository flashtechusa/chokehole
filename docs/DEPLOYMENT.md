# Deployment

`npm run build` typechecks and emits a fully static `dist/`. There is no server,
no database and no login.

```
Build command:      npm run build
Publish directory:  dist
Node version:       20 or newer
```

## Netlify

Drag `dist/` onto the Netlify dashboard, or connect the repo with the settings
above. A `netlify.toml` is not required; the SPA fallback is already handled by
the service worker's `navigateFallback`. If you add one:

```toml
[build]
  command = "npm run build"
  publish = "dist"
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## Cloudflare Pages

Framework preset **None**, build command `npm run build`, output directory
`dist`.

## Vercel

Framework preset **Vite**, output directory `dist`. No serverless functions.

## Any static host

`vite.config.ts` sets `base: './'`, so `dist/` also works from a subdirectory or
straight off a file server. HTTPS is required for the service worker and for
"Add to Home Screen" to behave like an app.

## PWA behaviour

- `vite-plugin-pwa` in `generateSW` mode precaches the JS, CSS, HTML and icons —
  around 1.3 MB. After the first load, a quick match is playable offline.
- `registerType: 'autoUpdate'`: a new deploy is picked up on the next visit.
- The manifest requests `display: fullscreen` and `orientation: landscape`.
  iOS honours the fullscreen display mode only for an installed (Add to Home
  Screen) app; in Safari the browser chrome stays.
- Icons are generated, not hand-drawn: `node scripts/gen-icons.mjs` rewrites
  `public/assets/branding/icon-{180,192,512}.png` and `favicon.svg`.

## Testing on a real phone

```bash
npm run dev     # prints a Network: http://<lan-ip>:5173 URL
```

Open that URL on a phone on the same Wi-Fi and rotate to landscape. To test the
service worker and installation you need a real build over HTTPS — deploy a
preview, or run `npm run preview` behind an HTTPS tunnel.

### Checklist

- Rotate to portrait: the rotate gate appears; rotate back: play resumes.
- Controls clear the home indicator and the notch (they read `env(safe-area-inset-*)`).
- No page scroll or pull-to-refresh while dragging inside the ring.
- Double-tap does not zoom the page.
- Add to Home Screen, then relaunch: fullscreen, landscape, offline-capable.

## Debug

Append `?debug=true` to the URL for the debug flag. The Phaser game instance is
exposed as `window.__CHOKEHOLE__` for console inspection and for the automated
smoke test.

## Wrapping for the app stores (later)

The same build wraps with Capacitor without code changes:

```bash
npm i -D @capacitor/cli && npx cap init && npx cap add ios && npx cap add android
npm run build && npx cap copy
```

Store distribution is explicitly **not** a requirement for this version, and
should not be attempted before the performer, music and venue permissions in
`docs/RESEARCH_NOTES.md` are settled.
