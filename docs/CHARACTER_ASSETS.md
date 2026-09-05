# Character assets

## Current state

**No bitmap character art ships in this build.** Every wrestler is drawn at
runtime by `src/game/render/FighterView.ts` from the `rig` block in their data
file. This is deliberate: gameplay never waited on artwork, and no performer
photography exists anywhere in the pipeline.

The rig draws a drag-wrestling figure, not a generic body: an exaggerated
hourglass built from `figure`, a wig mass from `wig`, a painted face from `face`
(glam / insect / machine), and an outfit silhouette from `costume` including
elbow gloves, thigh-high boots and platform heels. See
`docs/ADDING_A_CHARACTER.md` for the full field list.

**These are still placeholders.** They are built to read at phone size and to be
unmistakably two different performers -- not to resemble anyone. Actual likeness
needs approved reference imagery from the performer, at which point either the
rig colours/proportions get hand-matched or a sprite atlas replaces the rig
entirely.

## Replacing the placeholders with approved art

Drop the files here and set `useExternalAtlas: true` on the wrestler:

```
public/assets/characters/<id>/
  portrait.webp     512×512   character-select and results portrait
  select.webp       768×1024  full-body select art (optional)
  entrance.webp     768×768   entrance sting art (optional)
  victory.webp      768×768   victory pose (optional)
  sprite.webp                 the animation atlas
  sprite.json                 Phaser 3 texture-atlas JSON (hash format)
  prop.webp         256×256   the signature prop, separate for tinting/FX
```

### Frames

- Logical frame canvas: **320 × 320**, trimmed frames allowed.
- **Foot anchor at the bottom-centre of the frame**, consistently across every
  costume. The engine positions a wrestler by their feet; an inconsistent anchor
  makes them sink into or hover over the mat.
- Face right. The engine mirrors by flipping the container.
- Export at 2× if you want headroom; the atlas is scaled at runtime.

### Animation names

The renderer asks for these clip names, so the atlas must define them:

```
idle  walk  run  block  reversal
light1  light2  heavy
grappleStart  grappleHold  grappleThrow  grappled
hurt  down  getUp  taunt
signature  finisher
pin  pinned  victory  loss
```

Attack clips are re-timed to the move's real frame data: the first half of the
clip plays over `startup`, the next sliver over `active` (the contact frame
should sit right at the start of it), and the remainder over `recovery`. So the
**windup should occupy the first ~50% of the clip and the contact pose should
land at ~50%**, whatever the frame count.

Looping clips (`idle`, `walk`, `run`, `taunt`, `block`, `grappleHold`,
`grappled`, `down`, `pinned`, `pin`, `victory`, `loss`) must loop seamlessly.

### Hitboxes

Hit and hurt volumes come from move data (`reach`, `depthTolerance`) and
`TUNING.fighter.hurtboxHeight`, **not** from sprite bounds. Costume silhouettes
can differ wildly without changing the balance.

## Art direction reminders

- Exaggerated, readable silhouettes; a player must tell the two fighters apart
  by shape alone at phone size.
- Bright colour used selectively against dark arena space.
- Screen-print / riso / grunge texture over clean vector gradients.
- Keep a bright rim colour per character; the engine uses `rig.rim` for the
  silhouette pass and `rig.aura` for special-move particles even when an atlas
  is in use.

## Permissions

Approved reference imagery only, supplied by the performer or the collective.
Do not scrape web photography, and do not trace or copy sprites, UI, logos or
animations from any commercial wrestling game.
