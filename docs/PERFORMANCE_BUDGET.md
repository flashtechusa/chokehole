# Performance budget

Target 60 fps on current phones, acceptable floor a stable 30. Core gameplay must
stay correct when quality drops.

## Measured

    frame rate     60 fps          headless, every stage of `npm run smoke`
    bundle         242 KiB         precached, the whole game including the cast
    draw calls     n/a             it is a 2D canvas

Still **not measured on real hardware**, and that has not changed. But the floor
moved a long way: the same headless harness that reported 19–24 fps on the 3D
build reports a flat 60 on this one, and the shipped bundle went from 1,784 KiB
to 242 after Babylon.js was removed and the two performer cut-outs added. Those
cut-outs are WebP rather than PNG, which is the difference between 72 KiB and
410 KiB for the same two images with the same alpha. On a phone, a tenth of the download and a
canvas instead of a WebGL scene graph is the difference between "might hold 30"
and "should not be the bottleneck".

## Budget

| Item | Budget | Actual |
| --- | --- | --- |
| Wrestlers | 2 | one photographic cut-out each + ~12 drawn leg paths |
| Cast images | ≤ 2 | WebP with alpha, 25 KiB and 46 KiB (as PNG: 158 and 252) |
| Crowd | flat | ~120 slabs and ellipses, no ink line |
| Ring | flat | apron, mat, 4 posts, 6 ropes |
| Crowd signs | 9 | slabs, swayed on the update tick |
| Lights | none | flat colour; the ink line does the separating |
| Post-processing | none | — |
| Particles | pooled | capped by quality tier (40 / 90 / 150) |
| Textures | none | nothing is sampled; one halftone pattern tile |
| Comic layer | DOM, no draws | 5 elements, transform/opacity only, no `will-change` |

Quality tiers set device pixel ratio (1 / 1.5 / 2), whether halftone is drawn,
crowd rows, ink weight and the debris cap. The lowest tier is a plain flat
render at DPR 1, which is still the same game.
