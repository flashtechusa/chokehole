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

### The camera is ORTHOGRAPHIC

This is the other half of 2.5D, and it took three attempts to get right.

A perspective lens gives the ring vanishing points. The ropes converge toward
the edges of the screen, the mat opens out below the fighters as a receding
trapezoid, and the posts lean. However far back you put that camera and however
square you aim it, the picture reads as a three-dimensional box you are looking
into — which is exactly what it is. Moving the camera cannot fix that, because
the projection is what is doing it.

With no perspective divide at all, parallel lines stay parallel: the ropes are
horizontal, the posts are vertical, the mat is a flat band, and the arena reads
as a painted stage with 3D actors standing on it.

Everything else follows from that:

- **Yaw is exactly zero.** Not "nearly". Any yaw turns the ring back into an
  object seen from a corner.
- **The camera looks DOWN about thirty degrees**, which is the standard
  wrestling shot. Past roughly 28 degrees the near top rope drops below the
  fighters' feet, so you look *over* the ropes at the canvas instead of through
  them. Under a perspective lens that tilt is exactly what spread the mat into a
  receding trapezoid, which is why earlier passes kept driving the camera back
  down to rope height and still could not make it read flat. Orthographically it
  costs nothing: parallel stays parallel at any angle, so the shot can be angled
  like a wrestling camera *and* read as a stage.
- **The tilt is stored as an angle, not a height**, and the camera's height is
  derived from it, so the angle does not drift when the look point rises for a
  turnbuckle or drops for a body on the floor.
- **`dist` now sizes the orthographic box** rather than pushing the camera away.
  Every zoom rule that already existed — separation, a fighter on the floor,
  vertical spread, the hit punch — keeps working unchanged.
- **The camera's physical stand-off is fixed at 12.5 units**, chosen only to sit
  inside the building (walls at 15) and behind the crowd. With an orthographic
  projection it changes nothing about scale.
- **Nothing is on the camera side** — no crowd, no roof beams, no lighting cans.
  An orthographic lens renders near-side scenery at full size directly in front
  of the match, and at this angle a roof beam hangs straight across the ring.
  Real broadcast hard cameras look over an empty aisle for the same reason.
  Culling it also roughly doubled the frame rate.
- **Cinematic modes lean, they do not swing.** A signature used to swing the
  camera half a radian; an orthographic view spun off its axis stops reading as
  a stage. Drama comes from the zoom, the slow motion and the lighting instead.

The rig sits slightly above the fighters' centre of mass so they land below the
middle of the frame, clear of a HUD that owns the top quarter. The look point is
pushed left, tapering to nothing at the left rope, so the right-hand wrestler
never disappears behind the three buttons.

`npm run framing` measures all of this in screen pixels rather than by eye.

### One more thing the flat camera exposed

The ring's apron is a box, and a box maps its two Z faces as mirror images, so
the sponsor text printed across it came out backwards. Nobody had noticed while
the camera was angled; side-on it runs across the whole bottom of the screen.
Both Z faces now have their U flipped.

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
