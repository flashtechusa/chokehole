import type { ArenaConfig } from '@/game/types';

/**
 * TIMES SQUARE — CONDIMENT WARS. New York, NY. May 3, 2024.
 *
 * REAL LAYER: Choke Hole headlined wrestling at the foot of "Hot Dog in the
 * City", a 65-foot hydraulic sculpture in Times Square with confetti
 * programming. CONFIRMED in the research index.
 *
 * CLEARANCE NOTE: the sculpture is an artwork by a third party. The in-game
 * prop is an original stylised stand-in and the arena ships with a generic
 * display name available (see `genericName`) if clearance requires it.
 */
export const TIMES_SQUARE_2024: ArenaConfig = {
  id: 'times-square-2024',
  displayName: 'TIMES SQUARE — CONDIMENT WARS',
  genericName: 'THE BIG SQUARE (NEW YORK)',
  city: 'NEW YORK, NY',
  history: {
    eventName: 'CONDIMENT WARS',
    venue: 'Times Square, at the foot of "Hot Dog in the City"',
    city: 'New York, NY',
    date: 'May 3, 2024',
    note:
      'Choke Hole headlined a wrestling event in Times Square staged at the base ' +
      'of a 65-foot hydraulic hot dog sculpture that was programmed to fire ' +
      'confetti. Public plaza, barricades, billboards, daylight crowd.',
    research: 'CONFIRMED',
    sources: ['https://www.timessquarenyc.org/tsq-arts-projects/hot-dog-in-the-city'],
  },
  vibe: 'Open plaza, police barricades, billboard glare, and a colossal condiment rig over the ring.',
  palette: {
    skyTop: 0x1d2450,
    skyBottom: 0x3a1e46,
    haze: 0x31e7ff,
    structure: 0x5f6788,
    structureDark: 0x252a44,
    crowd: 0x151a30,
    crowdGlow: 0xffd23f,
    matCanvas: 0xf7efe0,
    matLogo: 0xff7a1a,
    apron: 0x1b2246,
    ropes: [0xffd23f, 0xf3e9dd, 0xd11a3a],
    posts: 0xd11a3a,
    lightWarm: 0xffd23f,
    lightCool: 0x31e7ff,
    floor: 0x20243c,
  },
  backdrop: [
    { kind: 'skyline', parallax: 0.06, y: 0, height: 210, tint: 0x2b3160, tint2: 0x161a34 },
    { kind: 'billboards', parallax: 0.16, y: 44, density: 6, tint: 0xff2d95, tint2: 0x31e7ff },
    { kind: 'hotdog', parallax: 0.34, y: 8, tint: 0xd11a3a, tint2: 0xffd23f },
    { kind: 'barricade', parallax: 0.6, y: 286, density: 20, tint: 0x3a4064, tint2: 0xffd23f },
    { kind: 'crowd', parallax: 0.58, y: 260, density: 52, tint: 0x151a30, tint2: 0xffd23f },
  ],
  ringHalfWidth: 336,
  ringDepth: 96,
  crowdIntensity: 1.35,
  event: {
    kind: 'confettiRig',
    label: 'THE RIG RISES',
    description:
      'GAME FICTION: at high HEAT the colossal condiment rig hydraulics up over the ' +
      'ring, and a finisher triggers the confetti cannons.',
  },
  unlock: { kind: 'winsWith', value: 3, label: 'WIN THREE MATCHES' },
  broadcastSkin: 'TV_LIVE',
};
