# Changelog

Meaningful playable changes only.

## 0.1.0 — Vertical slice

The first playable build: **JASSY vs RAID in the original New Orleans
warehouse**, on a phone, from title screen to victory screen without a reload.

### Playable
- Landscape mobile-first PWA (Phaser 3 + TypeScript + Vite), installable and
  playable offline after the first load.
- Cold-open title broadcast, main menu, three-step character/opponent/venue
  select, entrance sting, match, results, rematch.
- 2.5D ring: lateral movement plus a depth axis, depth-sorted, with rope
  rebounds and body separation.
- Combat: light chains, charged heavy, grapple → clinch (knees, throw, signature
  throw), block, timed reversals, knockdown, get-up mashing, taunts.
- Meters: health, SQUELSH (signature at half, finisher at full), shared crowd
  HEAT that decays and feeds the meter, the music, the lighting and the rating.
- Pinfall with a 1-2-3 count and a mashable kick-out; KO count-out; time-limit
  decision; draw.
- Two genuinely different wrestlers — JASSY (power heel, briefcase, GENTRIFICATION
  STATION / HOSTILE TAKEOVER) and RAID (grappler, canister, MUTATION SURGE /
  BUGS BITE BACK).
- Three real venues as arenas, each playing differently: the original warehouse
  (rig brown-out), Superchief Gallery (the crowd presses the ring smaller),
  Times Square (the condiment rig rises and fires on a finisher).
- Rookie / Card Match / Main Event AI running the same combat API as the player.

### Presentation
- Procedural character rig — original placeholder art drawn at runtime, no
  performer photography anywhere in the pipeline.
- Procedural arenas from parallax layer recipes.
- Broadcast layer: IBS bug, fictional viewer count, lower thirds, fake sponsors,
  signal corruption, impact frames, confetti, camera flashes.
- Fully synthesised audio: bell, impacts, crowd bed that tracks HEAT, and a
  warehouse music bed whose filter opens as the crowd heats up.

### Content and systems
- CHOKE HOLE ARCHIVES: all 30 documented tour stops with real history cards,
  research status and sources, separated from the game-fiction objectives.
- Roster screen including the documented personas that are not yet playable.
- Versioned local save: settings, unlocks, per-wrestler records, tour progress.
- Accessibility: reduced shake, reduced flash, high-contrast HUD, large text,
  subtitles, control opacity and size, adjustable match length.

### Known placeholders
- Character and arena art is procedural placeholder art pending approved
  references.
- Announcer lines are a synthesised stab plus on-screen subtitles.
- 27 of the 30 archive stops are history-only until their arenas are built.
- `freezeRay`, `projectionSwap`, `roulette` and `marchingBand` arena events are
  typed and reserved but not yet implemented.
