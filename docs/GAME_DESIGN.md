# GAME_DESIGN.md — implementation-facing design

The authority is the **Master Game Design Bible v1.1**. This file is the
condensed, code-facing version: what exists, where it lives, and how the systems
actually behave in this repository.

## 1. Pillars, as implemented

| Pillar | How the code honours it |
| --- | --- |
| Phone first | Landscape design surface whose width follows the device aspect (`config/tuning.ts`), floating thumb-stick, three ~63 CSS-px buttons, safe-area insets read from CSS `env()`. |
| Arcade, not simulation | 2–5 minute matches, exaggerated frame data, hit-stop, impact frames, no stamina/momentum sim. |
| Real personas | `data/characters/*` separates `publicPersonaSummary` (real, sourced) from moves/stats (fiction). |
| Real places | `data/arenas/*` and `data/worldtour/venues.ts` carry `RealHistory` records with research status and source URLs. |
| Choke Hole world-building | IBS bug, fictional viewer count, SQUELSH meter, fake sponsors, broadcast corruption, archive-tape framing. |
| Exaggeration | Screen-filling callouts, camera flashes, confetti rigs, corrupted-signal overlays. |
| Short sessions, deep replay | Unlockable arenas, SQUELSH rating, records per wrestler, archive progression. |
| Data-driven | Adding a wrestler or an arena is a new data file plus one registry line. |

## 2. Match structure

```
ENTRANCE  archive-tape card + name slams + quotes (skippable, pad hidden)
BELL      bell, crowd pop, "FIGHT"
LIVE      the match
PIN       cover, 1-2-3 count, kick-out window
ENDING    winner pose, bell, confetti, results hand-off
PAUSED    any time outside the finisher cinematic
```

Win conditions: **pinfall** (primary), **KO** (a fighter left on the mat at zero
health past the ten-count), **time limit** (most health remaining), **draw**.

## 3. Combat model

Everything lives in `combat/Fighter.ts` (state + physics) and
`combat/CombatSystem.ts` (contact). Both the player and the AI drive a `Fighter`
through the same `Intent` shape, so the AI has no privileged actions.

**States** — `IDLE WALK RUN ATTACK GRAPPLE_START GRAPPLING GRAPPLED BLOCK
REVERSAL STUN DOWN GET_UP TAUNT PIN PINNED WIN LOSE`.

**Ring space** is 2.5D: `x` is lateral, `depth` is 0 (far rope) to 1 (near rope),
`z` is height. Screen position is `centerX + x`, `baseY + depth * ringDepth - z`;
scale interpolates between `scaleBack` and `scaleFront`, and draw order sorts on
depth. An attack must match on **all three** axes, so footwork on the depth axis
is a real defensive option.

**Frame data** — every move declares `startup / active / recovery`. The hitbox
opens only during `active`, and the reversal window sits at the end of `startup`,
which is why heavy attacks are punishable.

**Attacks**
- *Light*: tap STRIKE. Chains into `lightAlt` when a combo is already running.
- *Heavy*: hold STRIKE past `heavyChargeMs`; it fires on the threshold with a
  charge ring as the tell. Knocks down.
- *Grapple*: GRAPPLE inside `grappleRange` locks a clinch. In the clinch,
  STRIKE = knees (max 3), GRAPPLE = throw, SQUELSH = signature/finisher throw.
  The victim mashes to escape; escaping stuns the attacker.
- *Signature* (50 SQUELSH): character-specific, usually applies a `FighterBuff`.
- *Finisher* (100 SQUELSH): 2–4s, screen flash, arena event, huge damage.
- *Taunt*: SQUELSH with an insufficient meter (or a double-tap). Heat + meter,
  and a wide-open recovery.

**Defence**
- *Block*: STRIKE + GRAPPLE held. Chips damage to 22%, drains guard, breaks.
- *Reversal*: block entered within `reversalWindow` of contact. Cancels the hit,
  stuns the attacker, pays SQUELSH and a large HEAT spike.

**Meters**
- *Health*: never an instant loss. At zero a wrestler is `exhausted` — cannot
  stand, cannot kick out — and is pinned or counted out.
- *SQUELSH* (0–100): gained by hitting, being hit, reversing, taunting; scaled by
  the wrestler's `squelshGain` and by crowd HEAT.
- *Crowd HEAT* (0–100, shared, decaying): fed by combos, reversals, specials,
  taunts, rope work. Drives crowd volume, music intensity, lighting, the
  fictional viewer count, arena events and the post-match rating.

## 4. Arena mechanics

`ArenaConfig.event.kind` selects behaviour, triggered above ~66% HEAT:

| kind | Behaviour |
| --- | --- |
| `lightFlicker` | The DIY rig browns out and strobes (original warehouse). |
| `crowdPress` | The usable ring width shrinks as the crowd closes in (Superchief). |
| `confettiRig` | The condiment rig hydraulics up; a finisher fires the cannons (Times Square). |
| `freezeRay` `projectionSwap` `roulette` `marchingBand` | Declared in the type, awaiting their arenas. |

Every effect is suppressed by the **reduce flash** accessibility setting.

## 5. AI

`ai/AIController.ts` picks a plan every `thinkMs` (approach, space, strike,
heavy, grapple, special, pin, block, taunt) and executes it through `Intent`. It
reads only visible information — the opponent's attack startup and charge tell —
and reacts after a profile-specific delay. Difficulty changes reaction and
tendency windows only; it never touches damage or health.

## 6. Presentation

Characters are drawn at runtime by `render/FighterView.ts` from a `RigSpec`
(colours, bulk, flourishes, prop) posed by keyframed clips in `render/poses.ts`.
A rim pass behind an inked body pass keeps silhouettes readable at phone size.
Arenas are drawn by `render/ArenaView.ts` from a list of parallax backdrop layer
recipes plus a procedurally built ring. Both exist so that gameplay never waited
on artwork — and both are designed to be replaced by approved assets.

## 7. Where the two layers live

`RealHistory` is the only place factual claims appear, and every one carries a
`research` status and `sources`. Everything else — moves, hazards, quotes,
objectives, sponsors, the whole IBS layer — is game fiction and is labelled as
such wherever the two appear together (the entrance card, the archive cards, the
roster cards).
