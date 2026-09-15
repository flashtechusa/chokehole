# CHOKE HOLE: NO HOLES BARRED

**EXTREME DRAG WRESTLING** — a mobile-first 2.5D arcade wrestling game built around the real CHOKE HOLE performers, their stage language, and the I.B.S. universe.

## Product direction

The visual/gameplay target is now deliberately closer to **action-arcade wrestling** than to a free-camera 3D wrestling simulation:

- large, recognisable performers
- left/right facing and a readable side-on wrestling camera
- contextual ATTACK / GRAB / IT controls
- paired wrestling choreography rather than physics knockback pretending to be a throw
- exaggerated comic-book impacts and impossible specials
- lightweight 2D crowd/venue layers so phone performance goes to the wrestlers
- real CHOKE HOLE moves, taunts, props and gags tagged separately from game-original material

This is **not** a clone of Action Arcade Wrestling and contains none of its code or assets. It is an independent implementation using common arcade-wrestling design ideas.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build into dist/
npm run preview    # serve the production build
npm run smoke      # end-to-end browser test at phone size
npm run typecheck
```

## Current vertical slice

Only one match matters until it is genuinely fun:

**JASSY vs RAID — The Original New Orleans Warehouse**

The simulation already supports contextual strikes, front/rear grapples, directional throws, Irish whips, rope running and rebounds, corner/perch states, dives, ground moves, pins, reversals, taunts, IT Factor, Squelsh and props.

The renderer is intentionally flat/2.5D. Performer likeness is more important than rendering complexity. Current Jassy and RAID artwork uses approved/reference-derived photographic upper-body cut-outs over a lightweight articulated 2D rig; the long-term pipeline is pose/animation atlases so the performer stays recognisable during every wrestling action.

## CHOKE HOLE-specific presentation now in the renderer

- event-driven 2D crowd reactions instead of expensive crowd AI
- crowd arms, signs and camera flashes that escalate for big spots, near falls and finishers
- Jassy giant-telephone finisher gag
- RAID Silly String stage-gag effect
- comic impact bursts, halftone, confetti and I.B.S. broadcast overlays

The telephone and Silly String presentation are based on publicly documented CHOKE HOLE appearances; the exact game choreography remains a game adaptation until approved by the performers.

## Architecture

```text
src/game/      renderer-independent wrestling simulation
  combat/      Fighter, CombatResolver, paired grapples/throws, PinSystem,
               ReversalSystem, MeterSystem, MatchSim, ring geometry
  characters/  wrestler configs, contextual moves, taunts and props
  arenas/      real-history and game-fiction fields kept separate
  ai/          same Intent surface as the player
  audio/       lightweight WebAudio synthesis
  input/       Intent surface used by touch, keyboard and AI
  save/        versioned localStorage behind a StorageAdapter

src/render2d/  2.5D/flat arcade renderer, articulated performers, arena,
               lightweight crowd and CHOKE HOLE-specific effects
src/ui/        HUD, touch controls, I.B.S. broadcast and comic overlays
```

Game rules never import the renderer. That is intentional: we can replace or improve character art without rewriting wrestling logic.

## Character-likeness rule

The priority order is:

1. performer likeness
2. fun/responsive wrestling
3. authentic CHOKE HOLE moves / taunts / props
4. readable animation
5. venue identity
6. crowd spectacle
7. rendering complexity

A technically impressive arena with generic wrestlers is a failed build.

## Documentation

- `docs/GAME_DESIGN.md`
- `docs/CANON_REFERENCE.md`
- `docs/ADDING_A_CHARACTER.md`
- `docs/ADDING_AN_ARENA.md`
- `docs/AUDIO_ASSETS.md`
- `docs/PERFORMANCE_BUDGET.md`
- `docs/RESEARCH_NOTES.md`
- `docs/DEPLOYMENT.md`
- `CHANGELOG.md`

The old full-3D and earlier Phaser work remain recoverable in git history/archived branches; they are references, not the current product direction.
