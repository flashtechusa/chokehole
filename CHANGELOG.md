# Changelog

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
