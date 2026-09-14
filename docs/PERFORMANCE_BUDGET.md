# Performance budget

Target 60 fps on current phones, acceptable floor a stable 30. Core gameplay must
stay correct when quality drops.

## Measured

**Not yet measured on real hardware.** Everything below is from headless
software rendering (SwiftShader), which reports 25–30 fps and says nothing about
a phone GPU. Treat the frame numbers as unverified until the game is opened on
a device.

Scene composition at match start: ~220 meshes, of which ~180 are crowd
instances sharing five source meshes and five materials.

## Budget

| Item | Budget | Actual |
| --- | --- | --- |
| Wrestlers | 2 high-detail | 2, ~20 merged meshes each, 1 material each |
| Crowd | instanced | ~180 instances, 5 sources |
| Real-time shadows | 0 | 0 — blob shadows instead |
| Lights | ≤ 4 | hemispheric + directional + up to 2 point |
| Post-processing | none required | none |
| Particles | pooled | pooled boxes/planes, no particle system |
| Textures | generated | canvas-drawn at runtime, no files |

## Quality tiers

`render/Engine.ts` picks a starting tier from cores, memory and pixel count, and
`App.autoQuality` drops a tier if the rolling frame time stays above 26 ms. It
only ever drops: hunting up and down mid-match is more distracting than a lower
resolution.

| Tier | Render scale | Fog | Coloured rig lights |
| --- | --- | --- | --- |
| LOW | 0.55× | off | 0 |
| MEDIUM | 0.77× | on | 1 |
| HIGH | 1.0× (device ratio capped at 2) | on | 2 |

Device pixel ratio is capped at 2 — a 3× phone gains nothing visible for more
than double the fragments.

## Cheap wins already taken

- Blob shadows instead of shadow maps.
- Per-bone mesh merging with baked vertex colours.
- `freezeWorldMatrix()` on static architecture.
- Frozen materials for repeated flat colours.
- Pooled FX geometry with no allocation per hit.

## If a phone struggles

In order: drop to LOW, then reduce `crowd.rows`/`density` in the arena config,
then drop the lamp cones. Do not touch the simulation — it is frame-rate
independent and the same code the harness measures.
