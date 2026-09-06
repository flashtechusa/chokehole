# GitHub Pages payload

Everything in this folder is exactly what a GitHub Pages site needs — nothing
else. Publish the **contents** of this folder at the root of a branch.

| file | why |
| --- | --- |
| `index.html` | the whole game, self-contained (~1.3 MB) |
| `.nojekyll` | stops Jekyll processing the build |
| `assets/branding/favicon.svg` | browser tab icon (`<link rel="icon">`) |
| `assets/branding/icon-180.png` | iOS home-screen icon (`<link rel="apple-touch-icon">`) |

`index.html` is the standalone build with the two icon `<link>` tags restored,
since here the files do sit beside it.

Regenerate with `npm run build:single`, then copy `dist-single/CHOKE-HOLE.html`
to `index.html` and re-add the icon links.

## Publishing it

```bash
gh repo create flashtechusa/choke-hole --public
cd pages
git init -b main
git add -A && git commit -m "Deploy CHOKE HOLE: NO HOLES BARRED"
git remote add origin https://github.com/flashtechusa/choke-hole.git
git push -u origin main
gh api -X POST repos/flashtechusa/choke-hole/pages \
  -f source[branch]=main -f source[path]=/
```

Or enable it by hand: **Settings → Pages → Source: Deploy from a branch →
`main` / `/ (root)`**.

Then confirm it actually loads:

```bash
URL=https://flashtechusa.github.io/choke-hole/ SHOT=/tmp/live.png \
  node scripts/check-deploy.mjs
```
