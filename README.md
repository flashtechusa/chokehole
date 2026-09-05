# CHOKE HOLE: NO HOLES BARRED — EXTREME DRAG WRESTLING

A mobile-first, landscape 2.5D arcade drag-wrestling game built as an installable
Progressive Web App. Open the URL on a phone, turn it sideways, and play.

> **Working title.** Every title/brand string lives in
> `src/game/config/branding.ts` so the collective can rename the game without
> touching game logic.

**This build is the vertical slice: JASSY vs RAID in the original New Orleans
warehouse.** All character art is original procedural placeholder art. No
performer photography is used anywhere in the pipeline.

---

## Run it

```bash
npm install
npm run dev          # http://localhost:5173  (also served on your LAN IP)
```

Open the LAN address on your phone, rotate to landscape, and play. `npm run dev`
prints the network URL; the phone and the laptop must be on the same Wi-Fi.

```bash
npm run build        # typechecks, then emits a static ./dist
npm run preview      # serve ./dist locally
npm run typecheck    # tsc --noEmit
```

`npm run build` output is a plain static directory — see `docs/DEPLOYMENT.md`.

## Controls

| Where | Control | What it does |
| --- | --- | --- |
| Left thumb | Floating stick | Move anywhere in the ring's 2.5D floor. Push fully or double-tap a direction to run. Run into the ropes to rebound. |
| Right thumb | **STRIKE** | Tap = quick strike (chains into a second hit). Hold ≈0.2s = heavy. |
| Right thumb | **GRAPPLE** | Grab → clinch. In a clinch: STRIKE = knee, GRAPPLE = throw, SQUELSH = signature throw. Near a downed opponent = pin. |
| Right thumb | **SQUELSH** | Half meter = signature. Full meter = finisher. Empty meter = taunt. |
| Both | **STRIKE + GRAPPLE** | Block. Pressed just as an attack starts = **REVERSAL**. |

Keyboard fallback: `WASD`/arrows move, `J` strike, `K` grapple, `L` squelsh,
`Space` block/reversal, `Esc` pause.

## What is in this build

- Title cold-open, menu, character select, arena select, entrance, match, results
- Two fully distinct wrestlers (JASSY: power heel; RAID: grappler/chaos)
- Three real Choke Hole venues as playable arenas, each with its own mechanic
- Health, SQUELSH meter, crowd HEAT, combos, reversals, grapples, throws,
  knockdowns, get-ups, signatures, finishers, pins with kick-outs, KO and time-limit
- Normal/Rookie/Main Event AI running the *same* combat API as the player
- CHOKE HOLE ARCHIVES: all 30 documented tour stops with real history cards
- Roster screen with the documented but not-yet-playable personas
- Accessibility options, settings persistence, installable PWA, offline play

## Repository map

```
src/game/config/     branding, palette, combat tuning, Phaser config
src/game/types/      every content type (wrestlers, arenas, moves, venues)
src/game/data/       the content itself — characters, arenas, tour venues
src/game/combat/     Fighter FSM + contact resolution
src/game/ai/         AI controller and difficulty profiles
src/game/input/      touch pad, keyboard, Intent
src/game/render/     procedural fighter rig, arena renderer, portraits
src/game/fx/         pooled particles, impact frames, broadcast corruption
src/game/audio/      synthesised SFX, crowd bed and music (no bundled audio)
src/game/ui/         HUD, widgets, UI kit
src/game/save/       versioned local save
src/game/scenes/     Boot, Title, Menu, Select, Match, Results, Archive, Roster,
                     Settings, HowTo
docs/                design, content-authoring and deployment guides
```

Adding content is a data change:
[docs/ADDING_A_CHARACTER.md](docs/ADDING_A_CHARACTER.md) ·
[docs/ADDING_AN_ARENA.md](docs/ADDING_AN_ARENA.md)

## Two layers of truth

The Design Bible's accuracy rule is enforced in the code:

- **REAL HISTORY** lives in `RealHistory` records (venue, city, date, note,
  research status, source URLs) and must stay factual. Where the research does
  not establish a venue, the string is an explicit placeholder such as
  `VENUE TBD — TEAM CONFIRMATION REQUIRED`. Nothing is invented to fill a gap.
- **GAME FICTION** is everything else — moves, stats, hazards, quotes, objectives —
  and is labelled as such wherever it appears next to history.

See [docs/RESEARCH_NOTES.md](docs/RESEARCH_NOTES.md) for every factual claim and
its source, and for the open questions the Choke Hole team still needs to answer.

## Asset and permission rules

- No scraped performer photography. All figures are drawn at runtime from data.
- No commercial music or third-party samples. All audio is synthesised in-browser.
- Venue display names are configurable and every arena ships with a
  clearance-safe `genericName` fallback that game logic uses no part of.
- Third-party artworks (e.g. the Times Square sculpture) appear only as original
  stylised stand-ins.

## Testing on a phone

1. `npm run dev`, note the printed network URL.
2. Open it in Safari/Chrome on the phone and rotate to landscape.
3. Share → Add to Home Screen to install it as a fullscreen app.
4. Append `?debug=true` for the debug flag.

## Licence / status

Prototype for the CHOKE HOLE collective. Not for public distribution until the
performers have approved names, likenesses, audio and venue usage.

## Smoke test

A headless end-to-end check lives in `scripts/smoke-test.mjs`. It boots the game
at an iPhone-landscape viewport, walks title → menu → select → entrance → match →
pin → results → archives → roster → how-to → settings, screenshots every step,
and exits non-zero on any console or page error.

```bash
npm run dev                        # terminal 1
npx playwright install chromium    # once
SHOT_DIR=/tmp/shots npm run smoke  # terminal 2
```

Playwright is deliberately not a dependency of the game — install it only if you
want to run this.
