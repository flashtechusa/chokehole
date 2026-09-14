# CHOKE HOLE: NO HOLES BARRED

**EXTREME DRAG WRESTLING** — a stylised full-3D, mobile-first arcade wrestling
game that runs from a URL on a phone.

Built to the *CHOKE HOLE Game Master Design Bible v2.0*, whose primary canon
source is the CHOKE HOLE 10.3 Pitch Deck.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build into dist/
npm run preview    # serve the production build
npm run smoke      # end-to-end browser test at phone size
npm run typecheck
```

## What exists

The first vertical slice only: **JASSY vs RAID** in a stylised composite of the
2018 New Orleans origin warehouse. No World Tour, no roster, no story mode —
the Bible is explicit that none of that ships before the fight is fun.

## Stack

Babylon.js 8 · TypeScript · Vite · PWA. The HUD, menus, prompts and touch
controls are an HTML/CSS overlay at real device pixels, not canvas text.

## Architecture

```
src/game/      simulation. imports no renderer, and is stepped by the headless
               pacing harness at a fixed timestep
  combat/      Fighter, CombatResolver, GrappleSystem-in-Fighter, PinSystem,
               ReversalSystem, MeterSystem, MatchSim, ring geometry
  characters/  wrestler configs: stats, ~20 contextual moves, taunts, prop
  arenas/      arena configs with REAL-history and GAME-FICTION fields kept apart
  ai/          same Intent surface as the player; difficulty is timing only
  audio/       WebAudio synthesis. no audio files ship
  input/       the Intent type
  save/        versioned localStorage behind a StorageAdapter
src/render/    Babylon: ring, warehouse, procedural character rigs, camera, FX
src/ui/        HTML/CSS HUD, touch pad, screens, I.B.S. broadcast layer
```

Game rules never touch a Babylon object. That is what lets the pacing harness
measure a match without a GPU.

## Documentation

- `docs/GAME_DESIGN.md` — systems and why they are tuned the way they are
- `docs/CANON_REFERENCE.md` — pitch-deck canon vs. game-original invention
- `docs/ADDING_A_CHARACTER.md`, `docs/ADDING_AN_ARENA.md`
- `docs/3D_ASSET_PIPELINE.md`, `docs/AUDIO_ASSETS.md`
- `docs/PERFORMANCE_BUDGET.md`, `docs/RESEARCH_NOTES.md`, `docs/DEPLOYMENT.md`
- `CHANGELOG.md`

## Placeholders

All character and arena art is procedural placeholder geometry. No performer
photographs are used anywhere. Move names, taunts and props are labelled
`GAME_ORIGINAL` or `GAME_ADAPTATION` in the data until the team supplies
`REAL_VERIFIED` ones. See `docs/CANON_REFERENCE.md`.

The rejected 2D/Phaser prototype is preserved on the
`archive/2d-phaser-prototype` branch.
