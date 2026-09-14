# Deployment

## Build

```bash
npm run build     # typecheck + vite build into dist/
npm run preview   # serve dist/ locally
npm run smoke     # end-to-end test against the preview server
```

`dist/` is a static site: `index.html`, hashed assets, a PWA manifest and a
service worker. It can be served from any static host.

## GitHub Pages

`main` on `flashtechusa/chokehole` is the Pages branch and contains the built
site at its root, plus an empty `.nojekyll`.

```bash
npm run build
# copy dist/* to the pages branch root, keep .nojekyll, commit, push
```

Pages must be enabled once at **Settings → Pages → main / (root)**. The GitHub
Pages API is blocked through this environment's proxy, so that step is manual.

## Verifying a deploy

`scripts/check-deploy.mjs` points a headless browser at a URL, boots the game and
fails on any 4xx/5xx, failed request or console error:

```bash
URL=https://flashtechusa.github.io/chokehole/ SHOT=/tmp/live.png \
  node scripts/check-deploy.mjs
```

Screenshots are captured at `deviceScaleFactor: 1` — true phone CSS pixels.
Capturing at 2 is what hid the unreadable type in the first prototype.

## PWA

`vite-plugin-pwa` generates `sw.js` and the manifest (landscape, fullscreen).
The service worker is registered only in production builds.

## Branches

- `claude/choke-hole-game-bc5gpa` — development
- `main` — built Pages payload
- `archive/2d-phaser-prototype` — the rejected 2D build, kept for reference
