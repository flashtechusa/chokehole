# Changelog

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
