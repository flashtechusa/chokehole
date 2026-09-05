# Adding a wrestler

Adding a performer is **two files and one line**. Nothing in `MatchScene`,
`Fighter`, `CombatSystem` or the AI changes.

## 1. Create the data file

Copy `src/game/data/characters/raid.ts` to
`src/game/data/characters/<id>.ts` and edit it. `id` is permanent and internal;
`displayName` is a display string the performer can change at any time without
touching save data or logic.

```ts
export const NEW_WRESTLER: WrestlerConfig = {
  id: 'newwrestler',              // lowercase, stable, never shown to players
  displayName: 'NEW WRESTLER',    // confirm the spelling with the performer
  tagline: 'THE SOMETHING',
  publicPersonaSummary: '…',      // REAL LAYER — factual, short, original wording
  personaResearch: 'TEAM CONFIRMATION REQUIRED',
  archetype: 'CHAOS',
  alignment: 'FACE',              // FACE | HEEL | CHAOTIC — drives crowd copy
  stats: { health, speed, power, grapple, reversal, squelshGain },
  moves: { light, heavy, grapple, signature, finisher },
  lightAlt: …,                    // optional second light in the chain
  prop: { name, mechanic, shape, color },
  rig: { … },                     // see "3. The look" below
  audio: { pitch, grit, hype },
  quotes: { entrance, taunt[], win[], lose },
  venueBonus: [{ arenaId, heatMult, note }],
  unlock: { kind: 'default', label: 'AVAILABLE' },
};
```

### Stat ranges

| Stat | Typical | Meaning |
| --- | --- | --- |
| `health` | 100–140 | Max health. |
| `speed` | 140–190 | Ring units per second at a full walk. |
| `power` | 0.85–1.3 | Damage multiplier. |
| `grapple` | 0.9–1.4 | Clinch duration and throw damage. |
| `reversal` | 0.85–1.25 | Multiplies the reversal timing window. |
| `squelshGain` | 0.9–1.25 | Meter build rate. |

Keep the sum of the multipliers near JASSY's and RAID's, and give each fighter
one thing they are clearly best at.

### Move frame data

```ts
{
  id, name, kind,                 // kind drives animation and hit reaction
  startup, active, recovery,      // ms — the reversal window is the end of startup
  damage, reach, depthTolerance,  // reach is horizontal; depthTolerance is the 2.5D axis
  knockback, hitstun,
  knockdown?, launch?,            // knockdown puts them on the mat
  squelsh, heat,                  // meter and crowd payout on a clean hit
  lunge?, shake?, impactTint?, callout?,
  buff?,                          // signatures usually apply one
  cost?,                          // 50 signature, 100 finisher
}
```

Rules of thumb: a light is ~90–120 startup, a heavy ~260–320 (it must be
reactable), a finisher 380–440. Longer reach should cost startup.

## 2. Register it

```ts
// src/game/data/characters/index.ts
import { NEW_WRESTLER } from './newwrestler';
export const ROSTER: WrestlerConfig[] = [JASSY, RAID, NEW_WRESTLER];
```

If the persona is documented but not yet playable, add it to `ROSTER_ROADMAP`
instead — it shows on the roster screen as a real, not-yet-playable persona.

## 3. The look

Until approved artwork arrives, the wrestler is drawn from `rig`:

```ts
rig: {
  scale, bulk,                    // silhouette mass
  skin, outfit, outfitAlt, trim, boots, gloves, hair,
  rim,                            // silhouette outline colour — pick a bright one
  aura,                           // special-move particle colour
  flourishes: [                   // this is what makes them recognisable
    { kind: 'bighair',      color, color2, scale },
    { kind: 'shoulderpads', color, color2 },
    { kind: 'antennae' | 'carapace' | 'extraArms' | 'wings' | 'visor'
           | 'mandibles' | 'tailStinger' | 'crown' | 'sash', color },
  ],
}
```

Props draw in the front hand: `briefcase`, `canister`, `syringe`, `microphone`,
`sign`, `none`.

**Silhouette test:** at phone size a player must be able to tell the two fighters
apart from shape alone. Vary `bulk`, hair volume and flourishes, not just colour.

## 4. Swapping in approved artwork

When the collective supplies approved sprite sheets, drop them at
`public/assets/characters/<id>/` (see `docs/CHARACTER_ASSETS.md`) and set
`useExternalAtlas: true`. The procedural rig stays as the fallback so a
half-finished art pass never breaks the build.

## 5. Never

- Never ship scraped photographs of a performer.
- Never invent biography. If the real persona detail is not sourced, write the
  short factual part and set `personaResearch: 'TEAM CONFIRMATION REQUIRED'`.
- Never copy movesets, names or audio from a commercial wrestling game.
