# Adding an arena

**Do not add arenas until the fight is fun.** The Bible is explicit (s7, s38)
and only one arena exists on purpose.

When that changes:

1. Create `src/game/arenas/<id>.ts` exporting an `ArenaConfig`.
2. Add it to `ARENAS` in `src/game/arenas/index.ts`.

## The two layers must stay apart

`ArenaConfig` separates them structurally:

- `historyCard` — one accurate sentence. Real.
- `sourceTier` — `DECK_CONFIRMED`, `PUBLIC_CONFIRMED`, `TEAM_CONFIRMED` or
  `TBD`. Rendered on the archive card next to the history.
- `fictionDisclaimer` and `spectacle` — clearly marked game fiction.
- `sources` — where the history came from.

If you cannot fill `historyCard` from a real source, the venue is `TBD`. Never
invent a date, an address or a floor plan.

## Environment

`render/WarehouseBuilder.ts` is the only arena builder today. A second arena
needs its own builder (or that one generalised) driven by `lighting` and
`crowd`. Keep collaborator-specific artwork separable from generic geometry so
an uncleared reference can be swapped for `fallbackDisplayName` and neutral
props.

## Spectacle rules

An arena gimmick must never decide a match at random. The warehouse's BAD WIRING
browns the lighting rig out at high crowd heat and presses the audience in; it
changes nothing about damage or control.
