# Changelog

## v4.1 — the arena

The room got the things a wrestling arena has and this one did not, and two
bugs turned up in the process that had been hiding in plain sight for the whole
build.

### The banner had never once been on screen
It hung at z = -14.6 with a comment calling that the far wall behind the crowd.
The camera sits at NEGATIVE z — `pos.z = look.z - cos(yaw) * dist` in
`DirectorCamera` — so -14.6 is the wall *behind the lens*, and the biggest
painted surface in the building had been rendering into the back of the camera
since it was added.

Moving it to the far wall was not enough either: the wall is fifteen units out,
and at this camera's downward tilt that puts its mid-height essentially on the
horizon, where anything readable lands behind the HUD. It is a hung scaffold
banner at z = 10 now, in the band between the health bars and the back row.

### Every plane texture in the building was upside down
`makeTexture` uploads with `invertY = false`, so a canvas drawn for a plane
arrives inverted. On a sign at match distance an upside-down word reads as a
MIRRORED word, which cost a full round of flipping the wrong axis before a
9× crop showed it was rotated 180°, not reflected. The signs, the banner and
the wall flyers all draw flipped in Y now. The flyers had been inverted on the
warehouse walls since they were added; nobody could tell, because they sit at
x = ±14.55 and the play camera never sees them.

### Barricade
A guardrail between the ringside floor and the front row, with a lit top rail —
the cheapest thing that says "arena" rather than "ring in a room". It sits just
outside `RING.floorHalf`, which is as far out as a wrestler thrown over the top
rope can get, so being flung into the barricade puts them against it rather than
through it. The crowd moved back behind it, and still presses up against it as
the room heats up. Ringside is the darkest part of the building, so the rail
carries its own value or it is a black shape in front of black shapes.

The far run of it is mostly hidden behind the raised ring, which is true of a
real hard camera too; it reads down the short sides and whenever the camera
drops to the floor.

### Crowd signs
Eleven hand-lettered boards held up over the front rows — the one band of the
far side that is not already crowd silhouette or rope. They sway, harder as the
heat rises, because a sign nobody is holding is a sign nailed to the air.

### Not done: the entrance ramp
It was on the list and it was measured out rather than built. A ramp goes on the
far side, where the ring itself occludes almost all of it at this camera, and
carving the crowd aisle it needs would empty the one part of the background that
currently reads. The effort went into the band the camera actually looks at.

### Cost
131 meshes to 198, 35,516 vertices to 38,263. The barricade is instanced from
one source; the signs are eleven small planes. Software-rendered frame rate
22-24 fps, within the noise of where it was.

## v4.0 — animation polish

Two things carried over from the comic layer's easing bug, and they turn out to
be the same lesson twice.

### The curve belongs to the keyframe, not the clip
`sampleClip` applied the same smoothstep to every span in every clip. That is
why the punches read as polite: a windup and a contact had identical
acceleration, so the fist arrived at the same speed it left. Real movement is
asymmetric — you drift into a windup and explode out of it, you land hard and
settle soft, and a falling body accelerates.

Keyframes now carry an `ease` describing how they travel to the next one:
`smooth` (the old default, still right for locomotion), `in`, `snap`, `out`,
`linear` and `hold`. Applied where it changes the read:

- **Strikes** drift back into the windup decelerating, then `snap` into contact.
  One curve, and most of the difference between a punch and a gesture.
- **Hit reactions** recoil instantly and recover slowly, never the reverse.
- **Knockdowns** accelerate into the mat and stop there.
- **Getting up** is slow off the mat and quick once the legs are under you.
- **Dives** accelerate off the leap.

### Settle frames
A body that stops dead where the punch left it is made of wood: the weight it
threw forward has to come back. Strikes, hit reactions, reversals and get-ups
now rock a little PAST neutral the other way before finding the stance. Strikes
also end exactly on the stance rather than on an offset recovery pose, so
handing back to idle no longer pops.

### Ankles
Nothing had ever posed the feet. They are the only bone whose geometry runs +X
from the joint rather than hanging down -Y, and with no rotation of their own
the whole boot was carried round by the leg at a fixed angle — so on a platform
boot the sole sat about seven degrees off the mat in the neutral stance, and a
leg swinging through a stride never put it flat. The foot counters the rest of
the leg now: flat when planted, toe dropping as it lifts.

### Idle is a weight shift
It was a bob: the body moved three centimetres up and down and nothing else. A
fighter standing still still moves — the weight goes from one foot to the other
and the hands drift with it. The lean is what carries it, because depth movement
in a game watched from the ropes is movement the camera cannot see.

### Not done: hips leading shoulders
The obvious next item, and it was measured out rather than built. Doing it
properly means sampling the clip a second time at an offset and taking the upper
body from that — a real per-frame cost for a lag of about one frame at the frame
rate the low tier actually runs at, on figures fifty pixels tall. It is written
down here so the reason survives, not the omission.

## v3.9 — the anatomy pass

Skinning made the limbs bend; they were still tubes. This is the geometry that
turns them into bodies, all of it chosen for what survives to twenty or sixty
pixels with a cel band and an ink line over it — silhouette, not detail.

- **Muscle bellies.** `limb()` takes an optional belly: a swelling part-way
  down the segment, offset along X. X matters because the camera looks along Z
  at a wrestler who faces X, so the visible outline of an arm is its
  front-to-back profile — a bicep has to bulge forward and a calf backward to be
  seen at all. Quad, calf, bicep and forearm all have one now.
- **Deltoid caps.** The shoulder is the top of the silhouette, and a bare tube
  end there gave every arm a cut-off, mannequin look.
- **A trapezius yoke.** A bare cylinder from chest to skull is what made the
  heads look stuck on: a real neck runs into the shoulders down a slope, it does
  not meet them at a right angle. Three primitives, and the single biggest
  "this is a body" cue on the rig.
- **Hands, instead of a ball on a stick.** A wrist, a fist deeper front-to-back
  than it is wide, a knuckle row and a thumb. The first version came out in one
  flat bright colour at the end of a dark sleeve and read as a mitten; the mass
  is in the shaded skin tone now and only the knuckles and thumb are in the lit
  one.
- **A nose and ears**, because the camera sits off to one side of the play line
  and mostly sees heads in profile, where a nose is the whole difference between
  a face and an egg.
- **An ankle collar**, so the shin does not run straight into the boot.

### The bouffant was eating the face
The hair was centred barely behind the skull and crowned FORWARD of it. The
arithmetic agrees with the screenshot: at eye height the mass reached x = 1.11r
with the eyes at 0.76r, so it covered the entire face and Jassy read as a gold
helmet. Both masses are set back and raised, and the dark under-layer meets the
brow as a fringe instead of painting across the eyes.

### Vertex budget
Two wrestlers are two thirds of the scene's vertices, so the anatomy is not
free: 9,334 to 13,210 each. Dropping the default sphere and cylinder
tessellation from ten segments to eight took that to 10,944 with no visible
difference at any distance the game is played at — 35,516 verts in the scene
against 39,838. Software-rendered frame rate 19-20 fps, against 20-21 before
the pass. That is SwiftShader, which charges CPU rates for vertex work; a real
GPU will not.

## v3.8.1 — the framing check was measuring the wrong thing

`npm run framing` had been reporting the same two problems for several passes:
the pin and near-fall cameras putting wrestlers' heads under the HUD. Acting on
it made the pin camera much worse — a wide shot of an empty ring with the
wrestlers a hundred pixels tall in the middle of it.

The tool was wrong. A wrestler is one skinned mesh now, and **a skinned mesh's
bounding box is its rest pose** unless you ask for the skeleton to be applied,
so the pin rows were measuring two STANDING bodies in a pin camera. It refreshes
bounds with `applySkeleton` now, and places the pair half a metre apart rather
than the metre and a half two standing wrestlers keep between them.

With true numbers the pin camera had the opposite problem: the pair sat at 96%
of the frame height, jammed against the bottom edge and under the pin
minigame's own UI, which is exactly what the screenshots had been showing all
along. The look point dropped from 1.78 to 1.24 — near mat level, which is where
a pin happens — and both cameras came in closer. The pin is centred now.

This is the second time in this project a verification tool has confidently
measured something other than the thing being checked, and the first time was
the reason `framing.mjs` exists at all.

## v3.8 — the comic panel layer

The game already had comic effects in the WORLD: a starburst billboard at the
contact, shards, a mat shockwave. What it did not have is the half of the genre
that happens to the PAGE — focus lines converging on a hit, the panel flooding
with the attacker's colour, a printed dot screen over a big spot. Those are
flat and screen-space, so they are DOM, not geometry.

### Focus lines
A repeating conic gradient on an element larger than the viewport, translated so
its centre lands on the hit and masked clear in the middle so the wrestlers are
never underneath it. Only transform and opacity animate, so the gradient is
rasterised once per burst and composited from there, and it is deliberately not
`will-change`: that would hold a layer that size in GPU memory for the whole
match rather than for the 400ms it is on screen. The focus is clamped away from
the screen edges — lines converging on the rim point at nothing.

### The impact card moved out of the world
The shouted noise used to be baked into the billboard texture at the contact
point, which meant a wrestler could stand in front of the callout, and on a
phone the word was about thirty pixels tall. It is screen-space type now:
italic 900-weight bone with an ink stroke and a hard drop shadow, on a
clip-path starburst in the attacker's colour, lifted off the contact point so it
sits over the shoulder instead of hiding the body being hit. It is sized off its
own character count so KRAKATHOOM and POW both fill the star, with a hard 24px
floor. The 3D burst keeps the starburst and loses the text, which also drops it
from one cached material per word to one per fighter.

### The words themselves
The card used to print the first word of the move's name — "Running" for a
Running Lariat, "Spinning" for a Spinning Heel Kick: the adjective, never the
hit. `impacts.ts` now holds invented comic noises keyed by move kind, graded by
power. Signatures and finishers sit the noise card out, because the spot card
already names those moves and two pieces of display type on a 390px-tall phone
is neither of them read.

### What gets the treatment
Two gates. Light work — jabs, stiff-arms — never gets it, because the filler
between the hits that matter has to look like filler. And nothing under a solid
connect gets it either, whatever it is filed under, so a chip-damage grapple
does not flash the screen.

### And an easing bug worth remembering
All three animations were written with the punch on the EFFECT — a
`cubic-bezier(0.16, 1, 0.3, 1)` ease-out across the whole duration. That easing
reaches 85% progress in the first quarter of the time, so a four-keyframe card
spent three of them on its own fade-out and read as a flicker. Measured: at
200ms of a 740ms card, opacity was 0.398 where it should have been 1. The
easing belongs on the keyframes; the effect runs linear.

## v3.7 — skinned wrestlers

Until now each wrestler was about twenty rigid chunks, one per bone, merged and
drawn separately. A bent elbow was two boxes hinging past each other: the join
opened as a visible notch, and every limb read as a doll's, not a body's.

Both wrestlers are now **one skinned mesh** driven by a real Babylon skeleton.

- `buildBoneSkeleton()` builds a 26-bone `Skeleton` mirroring the TransformNode
  hierarchy the clip player already animates. Rest matrices are **local** —
  `node.world * invert(parent.world)` — which is what Babylon wants; passing
  world matrices collapsed every figure into a heap at the origin.
- `BodyBuilder.finish()` now merges every primitive into a single mesh,
  transforms its vertices into rig space, and generates `matricesIndices` /
  `matricesWeights` from bucket membership blended by **distance from the
  joint**. The first attempt keyed the blend on the sign of `local.y`, which
  blended 96% of the vertices and smeared the whole figure; the blend band is
  now 0.06 world units, about a knuckle.
- `CharacterRig.syncBones()` copies the posed nodes onto the bones every frame,
  immediately after `applyPose()`. Babylon's own `Bone.linkTransformNode` does
  **not** propagate — verified directly: 26 bones linked, node rotated to -2 rad,
  bone matrix unmoved. So the sync is done by hand.

Verified through the real pose pipeline, not a side door: with the idle pose
biasing the forearm to +0.62 rad the bone's local matrix reads
`cos 0.814 / sin 0.581`; forced to -2.0 rad it reads `-0.416 / -0.909`, the
final matrix follows, and the geometry bends on screen. Ink outlines, cel
banding, cast shadows and glow all track the deformed mesh — the inverted hull
is skinned too, so there is no rest-pose ghost.

Draw calls per wrestler: **~20 to 1**. 9,334 vertices, 26 bones.

### Also
- `debug().setQuality(q)` forces a quality tier and drives the view's outline
  switch with it. The headless harnesses render on SwiftShader, which always
  detects LOW — the one tier with outlines, shadows, glow and rim light all off
  so without this no automated screenshot could ever show what a phone shows.

### What this does not fix
The limbs bend, but they are still built from boxes and capsules with no hands,
no neck taper and a flat face. That is the anatomy pass, next but one.

## v3.6 — the wrestlers, corrected against the reference photographs

Re-read the five supplied photographs — two studio shots of Jassy, the event
poster, two ring shots of RAID — and found that several things baked into the
models were simply wrong.

### Jassy
- **Her hair was wrong, and it is the thing that identifies her.** The model
  carried a near-black bob, with a code comment claiming that was "per the
  supplied reference photographs". It is a large **blonde bouffant with a dark
  under-layer**, wider and taller than the skull. Now built as one.
- **The costume is black patent**, not the dark purple it had been lifted to.
  That lift was a real fix at the time — a black costume vanished against a dim
  stage — but that was before the ink outline and the rim light, and the line is
  what separates her from the background now.
- **The pink jacket runs to the wrist.** Only the shoulder puff was coloured, so
  the arms were bare and the jacket did not exist below the shoulder.
- **A black tie over a pink collar**, which is what breaks up an otherwise solid
  black front in every photograph.

### RAID
- Lime green properly **saturated**, not a pale yellow-green.
- A **yellow lightning bolt across the back** — the clearest single identifier
  on the costume, and it was missing.
- Claws and trim moved from amber to the reference's harder yellow.

### And a cel-shading bug the dark costume exposed
Banding quantised luminance linearly, so the lowest non-zero step sat at a
quarter brightness and every dark value between an eighth and three-eighths
snapped up to it — which is why black latex rendered as lavender. It now bands
the square root and squares back, giving fine steps in the shadows and coarse
ones in the highlights. That is both how eyes work and how the reference art is
painted.

Costume details are recorded in `CANON_REFERENCE.md`. No photograph is used as a
texture: the models stay procedural and the reference is a description of what
to build.


## v3.5 — cel shading and ink outlines

The genre reference is *drawn*, not rendered: flat colour steps with a black ink
line around every silhouette. That treatment is worth far more on these models
than any amount of extra polygon, and it is what lets modest geometry look
deliberate instead of unfinished.

- **Ink outlines** on every wrestler chunk and every piece of ring furniture.
  A line around the silhouette makes flat colour read as drawn rather than as
  untextured, and separates an arm from the torso behind it without either
  needing more detail. Ropes are left bare — they are 8.5cm cylinders, and a
  line that width turns three ropes into three black bars.
- **Cel banding** via a material plugin that posterises the finished pixel into
  four steps. It quantises LUMINANCE and rescales the colour, so hue is
  preserved and only the shading steps; posterising channels independently
  shifts a pink toward red at one light level and not the next. It rounds to
  the nearest band rather than up — rounding up put a floor of one whole step
  under every pixel and turned a near-black costume into washed lavender.
  A plugin rather than a replacement material, so fog, vertex colours and the
  emissive channel the hit-flash drives all keep working.
- **Fatter ropes**, 5.5cm to 8.5cm. At the old width they were hairlines at
  match distance; the reference runs them thick and bright.

### The cost, measured
Outlines roughly double draws and fill for the wrestlers and the ring. Under
software rendering the frame rate went 28 fps → 15. A CPU rasteriser
over-penalises fill and a GPU will charge far less, but it is not free, so they
join the shadow map, the glow and the rim light in being MEDIUM-and-above only.
LOW is now exactly as cheap as it was before any of this work.


## v3.4 — lighting, shadows and bloom

First pass on how the wrestlers look. They are procedural rigs — primitives
merged per bone, baked vertex colours, one material each — and at the distance
the game plays at, what makes them read is light and silhouette rather than
polygon count.

- **A cast shadow**, at last: one blurred exponential map on the key light, 512
  on MEDIUM and 1024 on HIGH, with the light's bounds pulled tight around the
  ring so its texels land on the canvas rather than spreading over the
  warehouse. The blob shadow stays underneath at every tier, because it is the
  only thing that reads a wrestler's height during a top-rope dive.
- **Bodies were a third self-lit.** At 0.34 emissive, an arm and the torso
  behind it were the same brightness and the whole figure read as a cut-out.
  Down to 0.13, with a real specular highlight.
- **A rim light** from behind and above, so a shoulder or a thigh has an edge.
- **Glow on the neon only.** A bloom pass finds the brightest emissive first,
  and the canvas and apron are the biggest surfaces on screen — at 0.3 and 0.5
  they blew out white. Down to 0.12 and 0.2; the ropes, posts and lamps keep
  theirs and get the bloom.
- **Practicals that stay on the ring.** The coloured rig lights were intensity
  x12 over a 16-unit range, so they reached the crowd and the walls: switching
  UP a quality tier flooded the warehouse pink and made the picture worse than
  the tier below it. Now x5 over 8.5, hung lower and tighter.
- **Joint balls.** The rig is rigid, not skinned, so a bent elbow or knee opened
  a visible wedge between two tube ends. A sphere the width of the tube fills it
  at any angle and merges into the same draw call.

Shadows and glow are both off at LOW, so the cheapest tier costs exactly what it
did before. Culling everything on the camera side of the ring — crowd, roof
beams, lighting cans — had already paid for most of the new work.

### Still the ceiling
At magnification the rigs are plainly primitives: tapered tubes for limbs, boxes
for torso and hips, a sphere per hand, minimal faces. Lighting cannot raise that
further. See GAME_DESIGN.md, "Known limits of the character models".


## v3.3 — the broadcast hard camera, matched to the reference

Working from Action Arcade Wrestling screenshots rather than from my own idea of
what 2.5D should look like. Three things were wrong, and two of them were things
I had introduced trying to fix the first.

- **The camera is above the ring, not beside it.** About twenty degrees up,
  outside the ropes, looking down across the mat. The near ropes now cross the
  fighters at the ankle and frame the bottom of the picture instead of cutting
  across their chests.
- **It is PERSPECTIVE again.** The orthographic pass flattened the ring into a
  diagram: parallel ropes, near and far posts the same size, no sense of a box
  to fight inside. It is a real technique and it is not what this genre looks
  like. What makes this game 2.5D is that the simulation runs on a line — not
  that the projection is flat. Converging ropes and a foreshortened mat are
  correct.
- **The shot is framed on the RING, not on the two bodies.** A hard camera, not
  a fighting-game camera: a wrestler is about a third of the screen height and
  the ring is the picture. Every pass that pushed a wrestler to 60% of the frame
  lost the ring around them. The framing check's "too small" threshold moved
  from 45% to 28% to match.

### The ring is square again
`ring.halfZ` is the rendered depth and nothing else — no system reads it for
gameplay. It was 1.9 against a width of 3.2, from when the fight could move in
depth and the band had to stay shallow to stop the camera chasing it. On a line
that reason is gone, and a shallow ring seen from an elevated camera reads as a
squashed box. A ring is square, so it is square, and the fight runs along the
middle of it.

### Fixed
The canvas logo ran away from the camera instead of across it — a box maps its
top face with U across X and V along Z. A quarter turn in UV space fixes it.
Only visible once the ring was square and the camera settled.

### Measured
Framing check passes at all 17 positions and all 7 camera modes. Smoke test
clean. Gameplay untouched: 115 s, 34 rope runs, 14 rebounds, 3 near falls.


## v3.2 — the camera looks down, like a wrestling camera

Side-on at rope height meant looking *through* the near ropes at the fighters.
The camera now sits about thirty degrees above the ring and looks down over the
ropes onto the canvas, which is the standard wrestling shot.

Past roughly 28 degrees the near top rope drops below the fighters' feet, so it
leaves the frame entirely. Under a perspective lens that same tilt is exactly
what spread the mat into a receding trapezoid — which is why the previous passes
kept driving the camera back down to rope height and still could not make it
read flat. Orthographically it costs nothing: parallel stays parallel at any
angle, so the shot can be angled like a wrestling camera *and* read as a stage.

- The tilt is stored as an **angle**, and the camera's height is derived from
  it, so it does not drift when the look point rises for a turnbuckle or drops
  for a body on the floor. Every cinematic mode is an angle now too.
- **Roof beams and lighting cans on the camera side are gone**, along with the
  near crowd. At this angle a roof beam hangs straight across the ring, and an
  orthographic lens draws it at full size.
- Zoom and look height retuned for the foreshortening a tilt introduces.

### Measured
Framing check passes at all 17 positions and all 7 camera modes. Frame rate
under software rendering went from 13–15 fps to **32**, mostly from not drawing
the near-side arena.


## v3.1 — the camera is orthographic now

v3.0 put the combat logic on a 2D plane, which was the right fix and only half
the job: the picture was still a perspective camera looking down into a ring
from above the top rope, and it still read as 3D.

A perspective lens gives the ring vanishing points — the ropes converge, the mat
opens out below the fighters as a receding trapezoid, the posts lean. No camera
position fixes that, because the projection is what is doing it.

- **Orthographic projection.** Parallel lines stay parallel: horizontal ropes,
  vertical posts, a flat mat band, an arena that reads as a painted stage with
  3D actors on it.
- **Yaw is exactly zero**, not "nearly zero". Any yaw turns the ring back into
  an object seen from a corner.
- **The camera stands at rope height** (2.22, against a top rope at 2.08)
  instead of above it at 2.45–2.64.
- `dist` now sizes the orthographic box instead of pushing the camera away, so
  every zoom rule that already existed keeps working untouched. The physical
  stand-off is fixed at 12.5 units — inside the building, behind the crowd.
- **Nobody sits on the camera side.** An orthographic lens renders a near-side
  spectator at full size in front of the match. Real broadcast hard cameras look
  over an empty aisle for the same reason. It also bought 4–6 fps.
- **Cinematic modes lean rather than swing.** A signature used to swing the
  camera half a radian and a finisher orbited; an orthographic view spun off its
  axis stops reading as a stage. Drama is the zoom, the slow motion and the
  lighting instead.

### Fixed
The apron's sponsor text was printed backwards. The apron is a box, a box maps
its two Z faces as mirror images, and nobody had noticed while the camera was
angled — side-on it runs across the whole bottom of the screen.

### Measured
Framing check passes at all 17 positions and all 7 camera modes: a wrestler is
49–62% of the screen height, tops clear of the HUD, feet in frame, clear of the
buttons. Smoke test clean. A match still runs 134 s with 32 rope runs and 11
rebounds.


## v3.0 — 2.5D for real: the fight happens on a plane

Two releases tried to fix "this looks 3D, not 2.5D" by moving the camera. Both
were wrong, because the camera was never the problem. 2.5D means 3D models and
a 3D arena with the **combat logic restricted to a 2D plane** — the model
Action Arcade Wrestling uses. The rendering here was never the issue; the fight
moving in depth was.

### The ring is a line
`combat/ring.ts` is now one axis end to end. Every body sits on `RING.playZ`
and the only horizontal coordinate in the simulation is `x`. The ring still has
four posts and four sides on screen; two of them are reachable, and that is the
point — pushing left or right always has a knowable destination.

Rewritten to match: movement, facing, hit detection, body separation, rope
running, climbing, the apron, throw aiming, pickups, the AI's whole navigation,
and the pacing harness.

### Facing is left or right
`facing` still stores radians because everything downstream does trigonometry
with it, but it only ever settles on 0 or PI. `dir` is the honest version.
Getting behind someone is now exact — you are behind them when you are on the
side they are not facing — instead of a cone measured from their yaw.

### Both ends are ropes AND corners
The player says which one they mean with a different input: sprint into the end
to run the ropes, walk to it and press GRAB to climb. The old rule "a corner is
not a rope" existed so a player crossing the ring diagonally to climb would not
rebound instead of arriving; on a line it made rope running impossible, because
every position close enough to trip the rope lookahead is also inside the corner
band.

**Measured effect: 26–38 rope runs and 8–17 rebounds per match**, against 0–3
before. Sprinting into a rope is now simply what happens when you hold a
direction toward one.

### Throw aiming, on one axis
| Input | Throw |
| --- | --- |
| Stick UP, at the ropes | Over the top rope, to the floor |
| LEFT/RIGHT + GRAB | Irish whip — they run and rebound |
| LEFT/RIGHT, at an end | Corner throw |
| Back | Back throw |
| Neutral | Forward throw (rear throw from a waistlock) |

### Controls
The stick is no longer rotated into the camera's frame — the camera is square to
the line, so LEFT is left, always. `moveY` moves nothing; it is a modifier.

### Also fixed
- A body whipped from a standing start next to the ropes rebounded on frame one
  and went nowhere: the rebound now requires still travelling *into* the ropes.
- "Over the top rope" was unreachable, because every place you can throw someone
  out of is also a corner and the corner case was tested first.

### Verified by direct probe
Turning both ways and holding a facing with no input; pushing the stick into
depth moving nothing; rear grapple, rear throw and back attack; rope run into a
rebound and a rebound strike; Irish whip into the ropes and back out at speed;
corner throw; throw over the top that actually leaves the ring; forward throw;
climb to perch to top-rope dive; ground move; prop spawn, pickup and swing; and
the crowd taunt and opponent taunt resolving differently.


## v2.3 — it actually looks 2.5D now

The 2.5D rework changed how the game *plays*. It did not change how it looks,
and the first playable still framed like a diorama: a 23-degree three-quarter
angle, a 49-degree wide lens and six units of distance, so you were looking down
at a whole ring containing two small figures.

### Framing
- **A longer lens** — 0.72 rad instead of 0.86 — flattens the perspective so the
  ring reads as a backdrop rather than a box you peer into.
- **Yaw down from 23° to 11°**, near side-on. Enough that bodies read as solid
  and two fighters at different depths separate on screen; not enough to turn
  the ring into an object.
- **Tilt down from 7° to 4°.** Every extra degree turned another band of empty
  mat into foreground.
- **Distance is now set from the vertical field of view**, which is what limits
  how big a wrestler can be. A 2.16:1 phone is over seven units wide at these
  distances — wider than the ring — so framing for the width was what kept
  pushing the camera back.
- **The rig sits above the fighters' centre of mass** so they land below the
  middle of the frame, clear of a HUD that owns the top quarter of the screen.
- **The look point is pushed left**, tapering to nothing at the left rope, so the
  right-hand wrestler stops disappearing behind the three buttons.

Measured across the full width of the ring and at every separation: a wrestler
is 51–58% of the screen height (was ~35%) and the pair stays inside the 12–79%
horizontal band. Every cinematic mode was measured the same way and retuned for
the new lens.

### Callouts
Move callouts are now a broadcast lower-third anchored bottom-left. Centred,
they sat directly over the two wrestlers and hid the fight they described.

### Out of the ring
- `outside` was never actually passed to the camera, so it had never widened for
  a fight that spilled onto the floor.
- The ringside floor stretched 2.6 units past the ropes, which is further out
  than the front row of the crowd: a thrown fighter could land BEHIND the
  audience, invisible, and drag the camera so far back that the near crowd
  filled the foreground. It is now 1.15, inside the front row.
- The camera frames from the pair's VERTICAL spread as well as their lateral
  one, so one fighter on the top rope or on the floor pulls the shot back and
  sits the taller arrangement lower in frame. Following the average height alone
  could not do this — the average is the same whether they are together or a
  mat-height apart.

### `npm run framing`
A new check that projects both wrestlers' bounding boxes to screen pixels and
reports the numbers across the width of the ring, at several separations, with a
fighter thrown to the floor, and in every camera mode. It fails on wrestlers
that are too small, heads under the HUD, feet off the bottom, or a body behind
the buttons.

### A note on how this was missed
The screenshots used to check the last build were taken a second after the match
started, which is inside the ENTRANCE camera's wide establishing shot — so every
verification screenshot was of the one camera mode that is *supposed* to be
wide. The screenshot tooling now waits out the entrance, and framing is checked
by projecting the wrestlers' bounding boxes to screen pixels rather than by eye.

## v2.2 — the ring pays

Follow-up to the 2.5D rework, driven by probing the four mechanics the pacing
harness never exercised: the Irish whip, ground moves, prop spots and the two
taunt kinds.

### Throw aiming was broken, and it was hiding a balance problem
- **The Irish whip was unreachable.** A throw's destination was classified by
  distance to a corner point, but the corner radius is larger than the ring's
  depth half-extent, so the four corner circles covered the entire long side and
  every lateral throw resolved as a corner throw.
- **A throw along the depth axis could not leave the ring at all**, because both
  axes were tested against the lateral half-extent.
- **A directional throw's impulse was overwritten.** Paired choreography holds
  the victim and zeroes their velocity every frame, then released them along the
  attacker's facing — so the direction the player aimed was discarded. Aimed
  throws now queue their impulse to the choreography's release frame.
- **"Throw them out" landed them on the apron**, which `applyBounds` then shoved
  back onto the mat.

Throw aiming is now measured in the room left in the aimed direction: a whip
works from anywhere, a corner throw needs a committed diagonal, and you cannot
put someone over the top rope from mid-ring — you drag them to the ropes first.

With that fixed, a throw to the floor stopped firing from everywhere, which
turned out to be what had been carrying the "spectacle beats grinding" result.
Two mechanics were added to earn it honestly:

- **Freshness.** Every move and taunt loses 0.3 of its crowd interest per use
  (floor 0.18, full recovery over 14 s). IT and heat scale with it; damage does
  not. The same jab hurts exactly as much the twentieth time, it is just worth
  nothing.
- **The rope counter.** A hit on someone in `WHIPPED` or `ROPE_RUN` is worth
  ×2.1 damage and IT and ×1.8 heat, and the broadcast calls it. An Irish whip
  does five damage on its own; this is what it is for.

### Finishes
The AI now drops whatever it was doing to cover an opponent at zero health, and
to strike someone coming back off the ropes. Before this it ran out its current
plan while the knockout count expired underneath it: half of all matches ended
on health attrition. Across the latest runs every match finished on a pin.

### Verified by direct probe
Irish whip (lateral and depth, victim rebounds off the ropes), corner throw,
throw to the floor from the ropes, forward throw on a neutral stick, the ground
move, prop spawn → pickup → swing → 17 damage, and the crowd taunt and opponent
taunt resolving to different moves at different IT.

## v2.1 — 3D rendered, 2.5D played

The free-3D Babylon build was playtested and rejected: the fight wandered, the
camera had to keep pulling back to follow it, and the wrestlers ended up tiny.
The rendering was never the problem, so none of it was thrown away. What changed
is the *gameplay* model underneath it.

### The play space
- The mat is now wide and shallow — 6.4 units across, 3.8 deep — instead of
  square. Both fighters stay large and the geometry stays readable.
- The camera has a **fixed yaw**. It pans within limits, shifts with depth and
  zooms modestly with the gap between fighters. It never orbits during play.
- Cinematic angles are reserved for big throws, top-rope dives, signatures,
  finishers, near falls, entrances and victories, and snap back to the familiar
  angle the moment the moment is over.
- The near-side ropes are ghosted (alpha 0.26) so a hard camera angle can still
  see the match through them.

### Turning is mandatory
- The joystick drives **movement and facing**. There is no permanent auto-face.
  Stand still with your back turned and you stay turned.
- Target assistance is a single nudge applied once when an attack *starts*, only
  toward someone already roughly in front and in range. Nothing rotates the
  wrestler per frame.
- Facing therefore creates real options: front tie-up, **rear grapple**,
  **rear throw**, **back attack**, running past, and turning after a rebound.
- `isBehind()` is measured from the *target's* facing, not the attacker's, so
  getting behind someone is a thing you do rather than a thing the game decides.

### Throws are choreography, not knockback
Every throw carries a `paired` block: the victim's clip, the hold offset in the
attacker's local frame, and the frame at which they are released. For the length
of the hold the victim is positioned by the attacker rather than by physics, so
a throw reads as two performers doing a move together. All six throws per
wrestler are paired.

### Rope running
- The run-up gate is gone: pressing into the ropes from a standstill starts a
  run.
- After a bounce there is a 420 ms grace during which the stick cannot cancel
  the run, so holding the stick through a rebound no longer drops you out of it
  five frames later.
- The ropes visibly deform on contact and the character auto-turns into the
  rebound while the player keeps control.

### Pins now scale with the match
A pin early in a match is a spot; a pin after a finisher is dangerous.

| Stage | Stakes | Effect |
| --- | --- | --- |
| Early | ×2.4 | Effectively an auto-kickout |
| Mid | ×1.35 | Wide escape zone; a spot, not a threat |
| Late | ×1.0 | A real but survivable cover |
| After a signature | ×0.7 | Genuinely threatening |
| After a finisher | ×0.34 | A three-count is likely |

The escape bar does not even appear until the count of ONE, so a near fall is
possible at all. Surviving to the last count shakes the camera, detonates the
crowd and pays IT.

Two basic moves cannot produce a three-count, by construction.

### Damage has an arc
Damage is scaled from ×0.5 early to ×1.45 late across the match, so the opening
exchanges build a story and the closing ones end it. Measured match length is
now 106–197 s against the 3–5 minute target.

### Move research
`docs/MOVE_RESEARCH_JASSY.md` and `docs/MOVE_RESEARCH_RAID.md` record what could
actually be sourced about each performer, with EVENT / YEAR / OPPONENT /
DESCRIPTION / SOURCE / CATEGORY / provenance for each entry, and state their own
limits plainly: direct page fetches are blocked by this environment's proxy, and
nothing in them is derived from watching footage. **No signature or finisher is
documented for either performer**, so both remain `GAME_ORIGINAL` and are
labelled as such in game.

### Bugs found and fixed in this pass
- The rear throw was unreachable: the corner-throw guard ignored stick
  magnitude, so a waistlock always resolved as a corner throw.
- Rope-run and whipped bounds still used square-mat limits after the ring was
  made shallow, so bodies stopped in mid-air.


## v2.0 — Babylon rebuild

The 2D/Phaser prototype was tested and rejected: not fun enough, too flat, and
unreadable on a phone. It is preserved on `archive/2d-phaser-prototype`.

### Replaced
- Renderer is Babylon.js 3D. Real ring, ropes, posts, apron and floor.
- HUD, menus, prompts and touch controls are an HTML/CSS overlay at real device
  pixels. Nothing important renders below 13 px.
- Controls are three buttons with no chords: ATTACK, GRAB, IT/SPECIAL. The
  reversal is a single timed ATTACK tap.
- **IT FACTOR** is the primary super meter and rewards spectacle, not damage.
  **SQUELSH** is a separate pickup with a real drawback.

### The ring is a playground
Rope running with rebounds, turnbuckle climbing and top-rope dives, dives to the
floor, the apron, corner throws, Irish whips, throws out of the ring, and
oversized props that break after three swings.

### Kept from the prototype
Character and arena data models, venue research, AI concepts, pin/victory
lifecycle, the versioned save behind a `StorageAdapter`, and the WebAudio
synthesis — all of which were already engine-free.

### Bugs found by the pacing harness and fixed
- Ground friction applied in mid-air, so every leap travelled 20 cm.
- `CombatResolver` required state `ATTACK`, silently rejecting every dive.
- A leaping move's hit window closed before the body arrived.
- Gravity pulled fighters off the turnbuckle during a dive's own startup.
- `doGrab` returned early on a distant downed opponent, making climbing — and
  therefore the entire top-rope game — unreachable.
- Walking toward a corner triggered a rope run, so corners could not be reached.
- A buffered second GRAB tap climbed up and immediately back down.
- `applyPose` overwrote the rig root every frame, pinning both wrestlers at the
  world origin, sunk into the mat.
- An exhausted fighter could never be counted out if the opponent kept hitting
  them.
- A dropped prop was re-picked-up on the same frame, forever.
- Props had unlimited uses and simply won matches.
- The pin was escapable on the first count, so no near fall ever happened.
- `InstancedMesh` was imported as a type only, so its side effect never ran.
