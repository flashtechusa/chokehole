# Changelog

Meaningful playable changes only.

## 0.1.5 — One-file build

You can now just open the game.

- `npm run build:single` bundles everything into a single self-contained
  `CHOKE-HOLE.html` (~1.3 MB). No Node, no server, no install, no internet —
  open the file and play, or send it to a phone and open it there. A built copy
  lives at the repo root so it can be downloaded and played straight from GitHub.
- Possible only because the game loads no external assets: every wrestler, arena
  and sound is generated at runtime, so there is nothing left to fetch once the
  code is inlined.
- The smoke test runs against the single file over `file://`, so the standalone
  build is verified the same way the hosted one is.
- The single file has no service worker (that needs a real origin), so it has no
  offline cache and cannot install to a home screen. Deploy `npm run build` for
  that.

## 0.1.4 — Jassy's hair corrected

- Jassy's wig is dark, not blonde. Corrected on the collective's direct
  confirmation — the studio stills read as two-tone under the set lighting, but
  the dark choppy flipped bob from the Balkan Beatdown poster is the real look.
- Added a `gloss` costume field: a specular sheen on patent and latex, applied to
  her leotard, gloves and boots. Without it a dark wig over a black patent
  leotard collapsed into one flat silhouette in a dark arena.

## 0.1.3 — RAID matched to reference

The team supplied reference photography for RAID, so his placeholder is now built
from the real costume.

- Sculpted creature head: a huge lipsticked maw packed with jagged teeth, small
  eyes riding above it and blue skull patches (new `maw` face kind).
- A fan of salmon spines sweeping back off the skull (new `crest` flourish).
- Neon lime limbs, a grey reptile-scale torso plate carrying a yellow lightning
  bolt, shiny amber trunks, grey knee pads (new `scalePanel`, `bolt`, `trunks`,
  `kneePads`).
- Yellow-green trainers with black side stripes instead of heeled boots (new
  `sneakers` / `sneakerStripe`) — he fights flat-footed.
- Four extra clawed arms fanning out from the waist, on top of the usual two.
  `extraArms` now takes a `count` and the limbs reach and claw properly.
- Chest flattened; he is broader in the shoulders and lower than Jassy.
- His prop is set to `none`: no prop appears in the supplied reference, and what
  he actually carries needs team confirmation.

Reference images are not shipped, traced or embedded — only read by hand.

## 0.1.2 — Jassy matched to reference

The team supplied reference photography for Jassy, so her placeholder is now
built from what she actually wears rather than a guess.

- Two-tone flipped bob: golden blonde over a dark under-layer with a choppy dark
  fringe falling over the forehead (new `flipbob` wig style and `darkFringe`).
- Pale contoured face, hot-pink eyeshadow swept up and out, over-drawn lips.
- Pink patent leg-of-mutton puff sleeves, black patent leotard with a plunging
  neckline, pink satin collar, black necktie, pink sash knotted at the hip, nude
  legs over black patent boots (new `puffSleeves`, `collar`, `tie`, `sashKnot`).
- Her prop is now the giant gold brick phone from the reference, replacing the
  placeholder briefcase.

Renderer fixes found along the way: arms now hang from the left and right
shoulder instead of a single point at the sternum (which was stacking both puff
sleeves into one blob on the chest), and the neck is interior detail that the
rim pass skips so it cannot bulge out of the silhouette.

Reference images are not shipped, traced or embedded — only read by hand.

## 0.1.1 — Character art pass

The placeholder wrestlers now read as drag performers rather than articulated
stick figures.

- The rig draws an exaggerated hourglass built from a new `figure` block
  (shoulders, bust, waist, hips, leg length, heel height) instead of a box torso.
- New `wig` block with real silhouettes — bouffant, beehive, long waves, bob,
  mohawk, ponytail — drawn as a hairline that frames the face rather than
  covering it, plus a side sweep.
- New `face` block: glam (lashes, brow, lips, eyeshadow, blush), insect
  (compound eye, brow ridge) and machine (visor).
- New `costume` block: blazer / leotard / harness / bodysuit silhouettes, belts,
  fringe, elbow gloves and thigh-high boots over platform heels.
- Legs attach either side of the hip and the boot runs from the foot up, so the
  stance reads instead of merging into one column. Heads sit on an actual neck.
- JASSY: padded shoulders, cinched waist, pink bouffant, power-blazer panels,
  gold trim, towering platforms. RAID: lower and wider, chitin plating, four
  arms, mandibles, antennae, brighter greens so he holds up in a dark arena.
- Character cards and the roster use a standing pose, so the costume reads at
  card size.

Still placeholders: these are built to be legible and unmistakably two different
performers, not to resemble anyone. Likeness needs approved reference imagery.

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
