# Game design

Every number below was set against the headless pacing harness
(`scripts/pace.mjs`), which stops the render loop and steps `MatchSim` at a
fixed 16.67 ms with a scripted player. Nothing here is a guess about feel that
was never measured.

## The shape of the game: 3D rendered, 2.5D played

Free 3D navigation was tested and rejected. The fight wandered, the camera had
to pull back to follow it, the wrestlers ended up small, and the player's sense
of left and right moved with the camera.

What replaced it keeps all the 3D — models, ring, ropes, props, lighting,
cinematic animation — and constrains the *gameplay*:

- The mat is **wide and shallow**: 6.4 across, 3.8 deep. You move in four
  directions on a real plane, but the depth axis is a band, not a field.
- The camera is a **fixed three-quarter wrestling view**. It pans, shifts
  slightly with depth and zooms inside a tight range. It never orbits during
  play. Cinematic modes may move it and always return to the same angle.
- Both wrestlers stay large on a phone screen.

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

**Measured:** a player who only jabs and throws *loses* on NORMAL; a player who
uses the ring wins. The most entertaining way to play is the strongest.

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

## Measured match shape

Scripted player, showman style, one run per difficulty:

- length 106–197 s
- dives thrown 4–8, landed 2–6
- reversals 11–30
- signatures 2–4, finishers 1–3
- rear throws 3–4, back attacks 0–3
- near falls, props and taunts all firing

## Known gaps

- **Rope running is under-exercised by the harness.** The mechanic is verified
  directly — a probe drives a sprint into the ropes and gets 59 frames of rope
  run, two rebounds and a rebound attack — but the scripted player rarely
  chooses it, so the per-match counts in the pacing report read near zero. The
  bot is the limitation, not the game.
- **Difficulty separation is not measured.** The scripted player is crude and
  loses more often than a person would; run-to-run variance swamps the gap
  between NORMAL and BRUTAL.
- The KO count sometimes finishes a match that would be better as a pin, when
  neither fighter covers.
- **Frame rate is unverified.** Software rendering reports 16–30 fps and says
  nothing about a phone GPU. Untested on hardware.
