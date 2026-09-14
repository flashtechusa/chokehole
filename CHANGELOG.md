# Changelog

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
