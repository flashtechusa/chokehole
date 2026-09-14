# Game design

Every number below was set against the headless pacing harness
(`scripts/pace.mjs`), which stops the render loop and steps `MatchSim` at a
fixed 16.67 ms with a scripted player. Nothing here is a guess about feel that
was never measured.

## The loop

`MOVE → HIT → IMPACT → CROWD REACTS → IT FACTOR RISES → GRAB → SLAM → SPECIAL →
FINISHER → PIN → REMATCH`

## Controls: three buttons, about twenty moves

There are no chords, no hold timings and no double-tap to run. The move you get
depends on where you are and what your opponent is doing.

| Situation | ATTACK | GRAB |
| --- | --- | --- |
| Standing | 3-hit string, third is automatically heavy | tie-up |
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

## Damage is the same story

Basic strikes do 2.4–3.8 on an 800/840 health pool — they chip. Dives, rebounds,
props, signatures and finishers do 20–66. You cannot grind someone down with
jabs inside the match clock.

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

## The pin is a finish, not an opener

Covers are allowed from 55% health down. The escape is one timed tap on a
sweeping bar, and the zone is weighted per count: **the first count cannot be
escaped at all**, the second is moderate, the third is generous. So the ordinary
outcome is the kickout at two — the biggest crowd moment in a match — and a
flattened opponent stays pinned.

Taps at the ends of the sweep do not burn your attempt, so players who mash out
of habit are not silently punished.

## Crowd heat

Under the hood (Bible s10.4). It drives the lighting rig browning out, crowd
animation, audio, IT gain and the post-match rating. The HUD shows one word.

## Measured match shape

Three runs per difficulty, human-paced scripted player, showman style:

- length 100–180 s
- dives thrown 6–18, landed 4–11
- reversals 7–20
- pins 0–5, kickouts 0–4, near falls when a pin goes long
- props used, taunts fired, finishers landed 1–3

## Known gaps

- Difficulty separation between NORMAL and BRUTAL is within run-to-run noise.
  The AI's aggression and reaction differ; its measured win rate does not
  separate cleanly yet.
- The KO count (nine seconds at zero health) sometimes finishes a match that
  would be more satisfying as a pin, when neither fighter covers.
- Frame rate has only been measured under software rendering (25–30 fps), which
  says nothing about a real phone GPU. Untested on hardware.
