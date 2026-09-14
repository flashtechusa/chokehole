# Adding a character

Nothing in `MatchScene`-equivalent code needs editing. A wrestler is data.

1. Create `src/game/characters/<id>.ts` exporting a `WrestlerConfig`.
2. Add it to `ROSTER` in `src/game/characters/index.ts`.

## What a WrestlerConfig needs

- **Canon**: `canonSummary` plus a `canonSource` tier. If the deck does not
  support a claim, do not make it.
- **Stats**: `health`, `speed`, `power`, `reversal`, `itGain`, `radius`,
  `height`, `air`. `air` scales jump height and distance — it is the main lever
  that makes one wrestler an aerialist and another not.
- **Moves**: the twenty entries of `MoveSet`. Every one carries a `provenance`.
  A move with a `leap` is a committed jump and resolves in the air.
- **Taunts**: at least one each of `short`, `crowd`, `opponent`. A `big` one is
  optional. The context picker falls back safely if a kind is missing.
- **Prop**: the wrestler's own oversized object and its swing.
- **Squelsh**: the buff *and its drawback*. If it has no drawback it is a second
  super meter, which the Bible explicitly forbids.
- **Rig**: proportions, palette, head kind, costume and extras. See below.

## Making them feel different

Jassy and RAID are deliberately opposite on every axis: speed, reach, air,
per-hit damage, grapple range, and startup frames. Copying one and changing the
colours produces exactly the thing the Bible warns against.

Give the renderer something to work with too:

- `proportions.bulk`, `hunch`, `heel` and `shoulderW` change the silhouette
  before any animation runs.
- `render/rig/clips.ts` exposes a `Style` (`amp`, `lean`, `stance`, `bounce`,
  `elbow`, `sway`). `STYLE_POISED` and `STYLE_BRUTE` produce visibly different
  walks from the same clip library. Add a new one rather than reusing.

## Rig geometry

`RigSpec` is interpreted by `render/rig/buildBody.ts`. Head kinds are `glam` and
`insect`; costume tops are `leotard` and `harness`; extras cover additional arm
pairs, antennae, shoulder pads and a hip prop. Extend `buildBody` for anything
new, and keep it primitive-based until approved GLB assets exist.

## Checklist

- [ ] Every move, taunt and prop has a `provenance`
- [ ] Silhouette is distinguishable from the existing roster at match camera
- [ ] Squelsh effect has a real drawback
- [ ] `npm run typecheck` passes
- [ ] The pacing harness still produces a 100–180 s match with them in it
