# Adding a real Choke Hole venue

An arena is **one data file and one registry line**. The renderer builds the
backdrop from a list of layer recipes, so no drawing code changes.

## 1. Confirm the history first

Fill `history` before anything else. It is the REAL layer:

```ts
history: {
  eventName: 'Condiment Wars',
  venue: 'Times Square, at the foot of "Hot Dog in the City"',
  city: 'New York, NY',
  date: 'May 3, 2024',
  note: 'Original short summary written from public sources.',
  research: 'CONFIRMED',
  sources: ['https://…'],
}
```

If the research does not establish the venue, write the placeholder verbatim —
`'VENUE TBD — TEAM CONFIRMATION REQUIRED'` — and set `research` to
`'DATES CONFIRMED; VENUE TBD'`. **Never guess a venue to fill the field.**
Add the same stop to `src/game/data/worldtour/venues.ts` so it appears in the
Archives even before the arena is built (`arenaId: null, status: 'ROADMAP'`).

## 2. Create the arena file

Copy `src/game/data/arenas/nolaWarehouse2018.ts`.

```ts
export const MY_ARENA: ArenaConfig = {
  id: 'venue-year',
  displayName: 'THE VENUE',
  genericName: 'CLEARANCE-SAFE NAME',   // logic never reads displayName
  city: 'CITY, ST',
  history: { … },
  vibe: 'One line on how the room feels.',
  palette: { … },                        // see below
  backdrop: [ … ],                       // parallax layers, far to near
  ringHalfWidth: 372,                    // playable half-width in ring units
  ringDepth: 92,                         // screen px between the far and near rope
  crowdIntensity: 1.0,                   // multiplies all HEAT earned here
  event: { kind, label, description },   // GAME FICTION — say so in the text
  unlock: { kind: 'winsWith', value: 1, label: 'WIN ONE MATCH' },
  broadcastSkin: 'ORIGIN',
};
```

### Palette

`skyTop`/`skyBottom` (the wall wash), `haze`, `structure`/`structureDark`,
`crowd`/`crowdGlow` (silhouettes and their rim light), `matCanvas`/`matLogo`,
`apron`, `ropes` (three colours, bottom to top), `posts`, `lightWarm`/`lightCool`,
`floor`.

Keep `matCanvas` light and `crowd` dark: the fighters must read against both.

### Backdrop layers

Ordered far → near; `parallax` is 0 (painted on the far wall) to 1 (locked to
the ring).

| kind | Use |
| --- | --- |
| `brickwall` `gallerywall` `skyline` | The far surface. |
| `graffiti` | Sprayed words. `density` = word count. |
| `rafters` `trussLights` `stagerig` | Overhead structure and lamps. `trussLights` animates and browns out during `lightFlicker`. |
| `banners` `billboards` | Fake sponsor graphics from `config/branding.ts`. Keep them off the horizontal centre — the HUD's lower third sits there. |
| `projection` | Animated projection-mapped plane (PORTAL-era rooms). |
| `hotdog` | The original stylised condiment rig; rises during `confettiRig`. |
| `barricade` | Outdoor crowd-control barriers. |
| `crowd` | Bobbing silhouettes with a rim light. `density` = head count. Put it just above the ring's back edge (`y ≈ 260`). |

### Arena events

`event.kind` is the mechanic: `lightFlicker`, `crowdPress`, `confettiRig`,
`projectionSwap`, `freezeRay`, `roulette`, `marchingBand`, `none`. It fires above
~66% crowd HEAT (and on a finisher, for `confettiRig`). The last four are typed
and reserved but not yet implemented — wire them in `ArenaView.update` and
`MatchScene.onSpecial`.

`event.description` is shown to the player, so start it with `GAME FICTION:`.

## 3. Register it

```ts
// src/game/data/arenas/index.ts
export const ARENAS: ArenaConfig[] = [ …, MY_ARENA ];
```

Then set the matching tour stop's `arenaId` to the new id and its `status` to
`'PLAYABLE'`.

## 4. Check it on a phone

- Nothing bright sits under the touch controls (bottom-left and bottom-right).
- The crowd does not obscure the fighters' feet.
- With **reduce flash** on, the arena is still playable and legible.

## 5. Clearance

If a venue name, a sponsor or an artwork needs clearance, ship the arena with a
`genericName` and swap `displayName`. No game logic reads `displayName`, so the
change is cosmetic and reversible.
