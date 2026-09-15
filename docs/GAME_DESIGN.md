# Game design

Every number below was set against the headless pacing harness
(`scripts/pace.mjs`), which stops the render loop and steps `MatchSim` at a
fixed 16.67 ms with a scripted player. Nothing here is a guess about feel that
was never measured.

## The shape of the game: 3D rendered, 2.5D played

Everything is Babylon.js 3D — real geometry, real lighting, procedural rigs, a
3D arena. **The combat logic runs on a 2D plane.** That is what 2.5D means, and
it is the model the genre's reference point, Action Arcade Wrestling, uses:
3D models and a 3D building, a fight restricted to one plane.

### The ring is a line

`combat/ring.ts` describes the whole play space on one axis:

```
     floor    apron  [=========== MAT ===========]  apron    floor
   -floorHalf      -half                        +half      +floorHalf
                    ^corner                    corner^
```

There is no depth in the simulation. Every body sits on `RING.playZ`, and the
only horizontal coordinate that exists is `x`. The ring still has four posts and
four sides on screen; you can only use two of them, and that is the point — a
player pushing left or right always knows exactly what is at the end of the
push.

Two earlier attempts at "make it look 2.5D" moved the camera and failed, twice,
because the camera was never the problem. What made it read as 3D was the fight
moving in depth.

### What each end of the line is

Both ends serve double duty, and the player says which one they mean with a
different input rather than a different position:

| Input at the end of the ring | What happens |
| --- | --- |
| Sprint into it | Rope run, then a rebound |
| Walk to it, press GRAB | Climb the turnbuckle |
| Walk out of it | Step onto the apron |
| Get thrown at it | Corner, or over the top to the floor |

This is why the old rule "a corner is not a rope" had to go. In two dimensions
it stopped a player crossing the ring diagonally to climb from rebounding
instead of arriving. On a line it made rope running *impossible*: every position
close enough to trip the rope lookahead is also inside the corner band.

### What this buys

Running the ropes went from something the scripted player managed once or twice
a match to **26–38 rope runs and 8–17 rebounds per match**, because sprinting
into a rope is now simply what happens when you hold a direction. Getting behind
someone is exact rather than a cone test. A throw has five destinations and the
player can tell them apart.

### The camera is a broadcast hard camera

Matched to the genre reference, Action Arcade Wrestling: **outside the ring, up
at about twenty degrees, looking down across the mat.** The near ropes cross the
fighters at the ankle and frame the bottom of the picture; the far ropes and the
crowd sit behind their shoulders.

It took four attempts to get here, and the wrong turns are worth recording:

- **Side-on at rope height** put both sets of ropes across the fighters' chests.
  A wrestling camera is *above* the ring, which is the only way the near ropes
  end up below the action.
- **Orthographic** flattened the ring into a diagram — parallel ropes, near and
  far posts the same size, no sense of a box to fight inside. It is a real
  technique, but it is not what this genre looks like. **What makes this game
  2.5D is that the SIMULATION runs on a line, not that the projection is flat.**
  A perspective lens with converging ropes and a foreshortened mat is correct.
- **Framing on the two bodies** rather than on the ring. This is a hard camera,
  not a fighting-game camera: a wrestler is about a third of the screen and the
  ring is the picture. Every pass that pushed a wrestler to 60% of the frame lost
  the ring around them.

The numbers:

| | |
| --- | --- |
| Projection | Perspective, 0.75 rad vertical |
| Elevation | 0.35 rad (~20°), stored as an ANGLE |
| Swing off dead-on | 0.15 rad — enough to see a corner post |
| Distance | 5.2–6.9, wrestler 42% → 33% of screen height |

The elevation is an angle rather than a height so that raising the look point
for a turnbuckle, or dropping it for a body on the floor, tilts the shot with
the action instead of flattening it.

The look point is pushed left, tapering to nothing at the left rope, so the
right-hand wrestler never disappears behind the three buttons. Cinematic modes
push in and step round; they never spin, because the player would have to
relearn left and right.

**Nothing is on the camera side** — no crowd, no roof beams, no lighting cans.
Near-side scenery sits directly in front of the match, and at this angle a roof
beam hangs straight across the ring. Real broadcast hard cameras look over an
empty aisle for the same reason. Culling it roughly doubled the frame rate.

`npm run framing` measures all of this in screen pixels rather than by eye.

### Lighting and shading

The wrestlers are procedural rigs: primitives authored per bone, merged into
**one skinned mesh** each, baked vertex colours, one material each. At the
distance the game actually plays at, what makes them read is light and
silhouette, not polygon count — so that is where the work went.

- **A cast shadow.** One blurred exponential map on the key light, at 512 on
  MEDIUM and 1024 on HIGH, with the light's bounds pulled tight around the ring
  so its texels land on the canvas instead of spreading over the warehouse. The
  blob shadow stays underneath at every tier, because it is the only thing that
  reads a wrestler's HEIGHT during a top-rope dive.
- **Less self-light.** Bodies were 0.34 emissive — a third of every pixel was
  flat unlit colour, so an arm and the torso behind it were the same brightness
  and the figure read as a cut-out. Now 0.13, with a real specular highlight, so
  the key and rim lights can shade a limb.
- **A rim light.** Dim and cool, from behind and above, picking out the top and
  back edge of a shoulder or thigh. Form needs somewhere to turn.
- **Glow on the neon only.** A bloom pass finds the brightest emissive first, and
  the canvas and apron are the biggest surfaces on screen — at 0.3 and 0.5 they
  blew out white and left the neon nothing to be brighter than. They are down to
  0.12 and 0.2; the ropes, posts and lamps keep theirs and get the bloom.
- **Practicals that stay on the ring.** The coloured rig lights were intensity
  ×12 over a 16-unit range, which reached the crowd and the walls — switching UP
  a quality tier flooded the warehouse pink and made the picture worse than the
  tier below it. Now ×5 over 8.5, hung lower and tighter.
- **Joint balls.** Held over from when the rig was rigid, where a bent elbow or
  knee opened a visible wedge between two tube ends. Skinning closes that wedge
  now, but the ball still rounds the joint's silhouette, and it costs nothing:
  it merges into the same mesh.

### Cel shading and ink outlines

The genre reference is drawn, not rendered: flat colour steps with a black ink
line around every silhouette. That treatment is what lets modest geometry look
deliberate, and it is worth far more on these models than any amount of extra
polygon.

**Outlines.** Every wrestler chunk and every piece of ring furniture is drawn a
second time, inflated along its normals, in near-black. A line around the
silhouette makes flat colour read as *drawn* rather than as untextured, and it
separates an arm from the torso behind it without either needing more detail.
Ropes are left bare — they are 8.5cm cylinders, and a line that width turns
three ropes into three black bars.

**Cel banding.** A `MaterialPluginBase` on the body material posterises the
finished pixel into four steps. It quantises LUMINANCE and rescales the colour
to match, so hue is preserved exactly and only the shading steps — posterising
the channels independently shifts a pink toward red at one light level and not
at the next. It rounds to the nearest band rather than up: rounding up puts a
floor of one whole step under every pixel, which turned a near-black costume
into washed lavender and cost the whole cast its value range.

It is a plugin rather than a replacement material precisely so that fog, vertex
colours, the emissive channel the hit-flash drives, and everything else that
already worked keeps working.

**The cost is real.** Outlines roughly double the draw calls and the fill for
every wrestler and every post. Measured under software rendering they took the
frame rate from 28 fps to 15 — a CPU rasteriser over-penalises fill and a GPU
will not charge nearly that much, but it is not free. They are on at MEDIUM and
HIGH and off at LOW, along with the rim light, the shadow map and the glow.

### The comic panel layer

Half of the genre happens in the world and half of it happens to the page. The
world half was already there — a starburst billboard at the contact, shards, a
mat shockwave. The page half is `ComicFx`, and it is DOM rather than geometry
because it is flat, screen-space and has to stay legible at phone size.

- **Focus lines.** A repeating conic gradient on an element larger than the
  viewport, translated so its centre lands on the hit and masked clear in the
  middle so a wrestler is never underneath it. The focus is clamped away from
  the screen edges: lines converging on the rim of the frame point at nothing.
- **A colour wash.** The panel takes the attacker's colour for a beat. On a
  phone the 3D burst is a few hundred pixels across and the eye may not be on
  it; the wash is what says a heavy one landed.
- **The impact card.** Screen-space display type on a clip-path starburst,
  lifted off the contact point so it sits over the shoulder rather than hiding
  the body being hit, and sized off its own character count against a hard 24px
  floor. It used to be baked into the billboard texture in the world, where a
  wrestler could stand in front of the callout and the word was about thirty
  pixels tall.
- **A dot screen** over the frame for the length of a cinematic spot.

Only transform and opacity animate, so each effect is rasterised once and
composited from there — and deliberately without `will-change`, which would hold
those layers in GPU memory for the whole match instead of for the fraction of a
second they are on screen.

Two rules keep it from becoming noise. Hits below a solid connect get shards and
nothing else, because the filler between the hits that matter has to look like
filler. And signatures and finishers get lines and wash but no noise card, since
the spot card already names those moves in full.

**Easing goes on the keyframes, not on the effect.** All three animations were
first written with a `cubic-bezier(0.16, 1, 0.3, 1)` ease-out across the whole
duration. That curve reaches 85% progress in the first quarter of the time, so a
four-keyframe card spent three of them fading out and read as a flicker —
measured at opacity 0.398 two hundred milliseconds into a 740ms card. The effect
timing is linear; the punch is per keyframe.

### Known limits of the character models

The rigs are still primitives underneath: tapered tubes for limbs, boxes for
torso and hips, a sphere per hand, minimal faces. Ink and cel bands hide a great
deal of that — the silhouette is what reads now — but they do not change what is
under the line. The remaining gains are:

1. **A rig pass**: better proportions, real hands, tapering, a neck, a face.
   Pure code, no assets, and survives being thrown away if models arrive later.
2. **Authored GLB models**, which `3D_ASSET_PIPELINE.md` already covers swapping
   in. Best result, needs assets this project cannot generate for itself.

Skinning used to head that list. It is done: each wrestler is a single mesh
bound to a 26-bone skeleton, and limbs bend instead of hinging. See
`Skeleton.ts` for the two things that are easy to get wrong — a bone's rest
matrix must be **local**, not world, and `Bone.linkTransformNode` does not
actually propagate, so `CharacterRig.syncBones()` copies node to bone by hand
every frame.

### The ring is square again

`ring.halfZ` is the ring's RENDERED depth and nothing else — no system reads it
for gameplay. It was 1.9 against a width of 3.2 back when the fight could move
in depth and the band had to stay shallow to stop the camera chasing it. With
the simulation on a line that reason is gone, and a shallow ring seen from an
elevated hard camera reads as a squashed box rather than a wrestling ring. A
ring is square, so it is square, and the fight runs along the middle of it.

Two texture bugs only became visible once the camera settled: the apron's
sponsor text was printed backwards (a box maps its two Z faces as mirror images)
and the canvas logo ran away from the camera instead of across it (a box maps
its top face with U across X and V along Z).

## Controls: the stick is left, right, and two modifiers

`moveX` moves and faces. `moveY` moves nothing — there is nowhere to move — so
it is a modifier the simulation reads when aiming:

| Input | Result |
| --- | --- |
| LEFT / RIGHT | Walk or run that way, and face that way |
| LEFT / RIGHT hard | Sprint; into a rope, that is a rope run |
| UP, while holding someone at the ropes | Throw them over the top |
| Neutral | Stand still, still facing wherever you were |

The stick used to be rotated into the camera's frame. It is not any more: the
camera is square to the line, so LEFT is left, always.

## Turning is mandatory

Facing follows the **stick**, never the opponent. The fighter used to be
magnetically rotated toward the other wrestler every frame, which quietly
deleted half of wrestling: you could not turn your back, run past someone, be
taken from behind, or face the crowd.

The only automatic turning left is:

- toward your own movement, at `turnRate`
- toward your own velocity while committed (rope run, whipped, mid-air)
- **one** light assist as an attack starts, which nudges toward a target already
  roughly in front and in range and does nothing at all to someone behind you

What that unlocks, and none of it was possible before:

| | |
| --- | --- |
| Front tie-up | GRAB while facing them |
| **Rear grapple** | GRAB while behind them — measured from *their* facing |
| **Rear throw** | released from a waistlock: a back-suplex family move |
| **Back attack** | ATTACK on someone who is not looking at you |
| Running past | just keep going; nothing turns you round |
| Turning after a rebound | the rebound turns you, and holding the stick no longer cancels it |

## The loop

`MOVE → HIT → IMPACT → CROWD REACTS → IT FACTOR RISES → GRAB → SLAM → SPECIAL →
FINISHER → PIN → REMATCH`

## Controls: three buttons, about twenty moves

There are no chords, no hold timings and no double-tap to run. The move you get
depends on where you are and what your opponent is doing.

| Situation | ATTACK | GRAB |
| --- | --- | --- |
| Standing | 3-hit string, third is automatically heavy | tie-up |
| **Behind them** | **back attack** | **rear grapple** |
| Opponent stunned | heavy | tie-up |
| Running the ropes | running attack, then rebound attack | rebound grapple |
| On the turnbuckle | dive (or dive to the floor) | climb down |
| In a corner, opponent away | — | climb the turnbuckle |
| Opponent in a corner | corner mount | tie-up |
| Opponent down and hurt | ground attack | **cover for the pin** |
| Opponent down and healthy | ground attack | pick them up |
| On the apron | dive / running attack | roll back in |
| Carrying a prop | swing it | drop it |
| Holding someone | slam | throw — direction chosen by the stick |

A throw's destination is chosen by the stick: forward, backwards, into a corner,
whipped into the ropes, or out of the ring entirely.

The ATTACK button relabels itself for the current context (`DIVE`, `STOMP`,
`SWING`, `RUNNING`) with a hint chip. With this many moves on one button, saying
what is about to happen is the difference between depth and confusion.

### Reversal

One large cue, one timed ATTACK tap. Tapping with no cue armed costs a short
lockout so it cannot be mashed. Difficulty scales only the AI's window, never
the player's.

## IT Factor rewards the show, not the grind

| Action | IT |
| --- | --- |
| Jab | 2 |
| Heavy | 5 |
| Throw | 8–9 |
| Running / rebound attack | 10–15 |
| Prop swing | 18 |
| Reversal | 22 |
| Top-rope dive | 26–28 |
| Dive to the floor | 32–36 |
| Kickout at two | 28 |
| Crowd taunt | 21–26 |

Damage taken pays 0.10 per point. A global `itScale` keeps time-to-finisher
near ninety seconds of genuinely entertaining work.

### The crowd stops caring about a move it just saw

Every move and taunt carries a **freshness** value, per fighter, starting at 1.
Each use drops it by 0.3 (floor 0.18) and it recovers fully over fourteen
seconds. IT Factor and crowd heat are multiplied by the freshness the move had
*before* this use; damage is untouched.

This is the whole "entertainment, not damage" rule expressed as a mechanic. The
same jab still hurts exactly as much the twentieth time — it just stops being
worth anything, and the player who works through a varied repertoire earns the
finisher first without any single move needing to be nerfed.

### Catching someone off the ropes

An Irish whip does five damage. It is not an attack, it is a setup: a hit landed
on someone in `WHIPPED` or `ROPE_RUN` is a **counter**, worth ×2.1 damage and IT
and ×1.8 crowd heat, and the broadcast calls it. That is what makes spending a
grapple on a whip correct, and it is the mechanical reason running the ring
beats standing still and trading.

## Damage is the same story, and it has an arc

Basic strikes do 2.4–3.8 on a 900/940 health pool — they chip. Dives, rebounds,
props, signatures and finishers do 20–66.

On top of that, **all damage scales across the match**, from ×0.5 at the bell to
×1.45 at the time limit. This is the arc, and it is deliberately not "more HP":
the opening is a feeling-out process that barely moves the bar, the middle is
where throws and rope work start to tell, and the closing stretch is where a big
move actually ends someone.

## Taunting is gameplay

Four taunts per wrestler, chosen by context: a quick one up close, a
disrespectful one over a downed opponent, and a long crowd taunt when you have
room — worth ten times a jab, and it leaves you standing still while someone
runs at you.

## Squelsh is a power-up, not a second meter

A can drops in the ring. Walking over it grants a timed buff with a real
drawback, and the two wrestlers get opposite trades:

- **Jassy — LIQUIDITY EVENT:** +34% damage, −16% speed. The drink calms you down.
- **RAID — UNSTABLE BATCH:** +38% speed, +85% IT gain, but +18% damage taken.

## Props

An oversized prop lands in the ring mid-match. **Three swings and it breaks.**
Measured unlimited: whoever picked one up simply won, twenty hits in a row, and
every other system stopped mattering.

## Throws are choreography, not knockback

A throw is two synchronised performances. When a paired move starts, the victim
is carried at a fixed offset in the attacker's own frame, plays the receiving
half of the clip on the attacker's playhead, and is only released into physics
at the move's `releaseAt` point. Simulating a suplex with an impulse and hoping
looked like two people sliding apart.

Every throw, signature and finisher carries a `paired` block naming the victim's
clip, the hold offset and the release point.

## Signature spots and finishers are presentation, not damage

A signature or finisher emits a `spot` event and the whole production reacts:

- the lighting rig drops to the wrestler's own colour and burns brighter
- the arena blacks out behind a slammed title card with the move name and its
  shout
- the broadcast tears, and a finisher drops the world into **slow motion**
  (`slowMo 0.35` for 1.5 s) so it reads as a moment rather than a stutter
- the camera takes one decisive angle for a signature, and is allowed to move
  for its own sake only during a finisher
- the crowd and the audio sting go with it

## The pin is a finish, not an opener

Covers are allowed from 55% health down. The escape is one timed tap on a
sweeping bar, and the zone is weighted per count: **the first count cannot be
escaped at all**, the second is moderate, the third is generous. So the ordinary
outcome is the kickout at two — the biggest crowd moment in a match — and a
flattened opponent stays pinned.

The zone is then scaled by where the match is, which is what makes a three-count
mean something:

| Stakes | Escape zone | Reads as |
| --- | --- | --- |
| EARLY (first quarter, healthy) | ×2.4 | near-automatic kickout |
| MID | ×1.35 | a one or two count |
| LATE | ×1.0 | near falls become possible |
| AFTER A SIGNATURE | ×0.7 | 2.5–2.9 |
| AFTER A FINISHER | ×0.34 | a dangerous three |

Two basic moves can never produce a three-count.

A near fall snaps the camera in tight, blows the lighting out white, pays the
kicker 28 IT, and hands the familiar angle straight back.

Taps at the ends of the sweep do not burn your attempt, so players who mash out
of habit are not silently punished.

## Crowd heat

Under the hood (Bible s10.4). It drives the lighting rig browning out, crowd
animation, audio, IT gain and the post-match rating. The HUD shows one word.

## Throw aiming

While holding someone, the stick picks the destination and the button picks what
happens there. The classification is measured in *room* — how much mat is left in
the aimed direction — not in a fixed projection, because the mat is wide and
shallow and each axis has to be judged against its own half-extent.

| Input | Result |
| --- | --- |
| No direction | Forward throw (or the rear throw, from a waistlock) |
| Direction, held back | Back throw |
| Diagonal (both axes committed) | Corner throw |
| Any direction + GRAB | **Irish whip** — they run and rebound |
| Any direction + ATTACK, with under 1.4 of mat left that way | **Over the top** to the apron or the floor |

From a rear waistlock there is one throw and it is the rear throw. That is what
makes walking round someone worth doing.

You cannot throw someone over the top rope from the middle of the ring. You drag
them to the ropes first, which is the whole reason position matters.

## Measured match shape

Scripted player, showman style, NORMAL, across several runs:

- length 106–178 s against the 3–5 minute target
- every run finished on a **pin**, none on the knockout count
- dives thrown 5–14, landed 1–7
- reversals 10–21
- signatures 1–4, finishers 0–3
- rear throws 0–6, back attacks 0–2
- near falls, props, counters and taunts all firing

## Known gaps

- **Rope running is under-exercised by the harness.** The mechanic is verified
  directly — a probe drives a sprint into the ropes and gets 59 frames of rope
  run, two rebounds and a rebound attack — but the scripted player rarely
  chooses it, so the per-match counts in the pacing report read near zero. The
  bot is the limitation, not the game.
- **Difficulty separation is not measured.** The scripted player is crude and
  loses more often than a person would; run-to-run variance swamps the gap
  between NORMAL and BRUTAL.
- **"Spectacle beats grinding" is no longer proven, only plausible.** The claim
  held while a directed throw wrongly resolved as a throw to the floor from
  anywhere on the mat; with that fixed, the crude close-range bot and the
  ring-using bot now trade wins roughly evenly over four runs each. The
  freshness rule and the rope counter were added to tilt it back and did, but
  four runs a side is inside the noise. It needs a better scripted player, or a
  human, before it can be claimed again.
- **Frame rate is unverified.** Software rendering reports 16–30 fps and says
  nothing about a phone GPU. Untested on hardware.
