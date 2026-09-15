# Deployment

## Build

```bash
npm run build     # typecheck + vite build into dist/
npm run preview   # serve dist/ locally
npm run smoke     # end-to-end test against the preview server
npm run framing   # camera framing check, in screen pixels
npm run agency    # player agency check, through the real touch controls
npm run pace      # headless match pacing harness
```

`npm run framing` projects both wrestlers' bounding boxes to screen pixels and
reports how much of the frame they fill, across the width of the ring, at
several separations, with one fighter thrown to the floor, and in every camera
mode. It exists because "it looks 2.5D" was once checked by eye and was wrong:
every verification screenshot had been taken a second after the bell, inside the
ENTRANCE camera's wide establishing shot — the one mode that is meant to be
wide. Screenshots of gameplay must wait out the entrance.

`npm run agency` drives the game through its OWN touch controls — real pointer
events on the stick zone and the three buttons — and measures how much of a live
match the player is allowed to do anything: what fraction of it they spend in a
state the OPPONENT put them in, the longest unbroken such stretch, and the median
window of freedom between them. It exists because the game shipped unplayable
while every other harness reported a healthy match. `pace.mjs` feeds intents
straight into the simulation and the ad-hoc tests patched `stickToWorld`; none of
them ever pressed a button. A harness that does not go through the same door the
player does will always tell you the room is fine.

It measures responsiveness directly, not through a proxy: every press is
timestamped and matched against the moment the fighter next acts, split by
whether they could act when the press was made. Free presses are gated hard
(p90 260ms); held presses are reported only, because being unable to swing while
face down is the genre, and `theirControl` already bounds how much of a match
that is. On the current build free presses answer in 16ms median, 33ms at the
p90 — one frame, two at the tail.

**Run it more than once.** Three consecutive runs of the same build read 35%,
28% and 50% of the match under the opponent's control. An average inside the
threshold is not the same as a game that is always playable, and the 50% run is
the one a player would have had. That third sample is what `chainBreak` exists
for: a ceiling on how long anyone can be held, rather than a tendency.

It reports `actionable` but deliberately does not judge it. Time spent in your
own attack animation is time you chose to spend, and a bot that mashes will drive
that number to the floor in a game that plays perfectly well.

It has since needed the same lesson applied to itself. A wrestler is one skinned
mesh now, and a skinned mesh's bounding box is its REST pose unless the skeleton
is applied — so for several passes the pin and near-fall rows were measuring two
STANDING bodies in a camera framed on a pin, and reporting a problem that did
not exist. It refreshes bounds with `applySkeleton` and places the pair
overlapping for those rows. **When this tool disagrees with a screenshot, take
the screenshot's side until you know why.**

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
