import type { ArenaConfig } from '@/game/types';

/**
 * SUPERCHIEF GALLERY — Ridgewood, Queens, NY. June 27, 2019.
 *
 * REAL LAYER: Choke Hole's New York debut; hundreds packed into a sweltering
 * warehouse gallery. CONFIRMED in the research index.
 *
 * GAME FICTION: the crowd-press mechanic and the landlord-vs-tenant heat bonus.
 */
export const SUPERCHIEF_2019: ArenaConfig = {
  id: 'superchief-2019',
  displayName: 'SUPERCHIEF GALLERY',
  genericName: 'QUEENS WAREHOUSE GALLERY',
  city: 'RIDGEWOOD, QUEENS, NY',
  history: {
    eventName: 'CHOKE HOLE — NEW YORK DEBUT',
    venue: 'Superchief Gallery',
    city: 'Ridgewood, Queens, NY',
    date: 'June 27, 2019',
    note:
      'Choke Hole’s New York debut. Hundreds of people packed into a sweltering ' +
      'warehouse gallery to watch drag wrestling at close range.',
    research: 'CONFIRMED',
    sources: [
      'https://www.vice.com/en/article/choke-hole-nyc-these-glorious-photos-show-off-the-subversive-world-where-drag-meets-wrestling/',
    ],
  },
  vibe: 'Sweat on the walls, no air, gallery lights gelled hot pink, the front row inside the ring space.',
  palette: {
    skyTop: 0x241426,
    skyBottom: 0x0e0712,
    haze: 0xff5fb0,
    structure: 0x5c4a5e,
    structureDark: 0x2b1f2e,
    crowd: 0x22131f,
    crowdGlow: 0xff5fb0,
    matCanvas: 0xf0e4d2,
    matLogo: 0x7a2bff,
    apron: 0x341440,
    ropes: [0xf3e9dd, 0xff2d95, 0xf3e9dd],
    posts: 0x31e7ff,
    lightWarm: 0xff5fb0,
    lightCool: 0xb6ff3a,
    floor: 0x1a1018,
  },
  backdrop: [
    { kind: 'gallerywall', parallax: 0.1, y: 0, height: 250, tint: 0x50405a, tint2: 0x2b1f2e },
    { kind: 'graffiti', parallax: 0.13, y: 104, density: 4, tint: 0x7a2bff, tint2: 0x31e7ff },
    { kind: 'trussLights', parallax: 0.22, y: 30, density: 5, tint: 0xff5fb0, tint2: 0xb6ff3a },
    { kind: 'banners', parallax: 0.28, y: 120, density: 2, tint: 0x7a2bff, tint2: 0xff2d95 },
    { kind: 'crowd', parallax: 0.56, y: 258, density: 46, tint: 0x22131f, tint2: 0xff5fb0 },
  ],
  ringHalfWidth: 352,
  ringDepth: 84,
  crowdIntensity: 1.25,
  event: {
    kind: 'crowdPress',
    label: 'THE CROWD PRESSES IN',
    description:
      'GAME FICTION: as HEAT climbs the front row physically closes on the ring, ' +
      'narrowing the usable floor and popping louder on every reversal.',
  },
  unlock: { kind: 'winsWith', value: 1, label: 'WIN ONE MATCH' },
  broadcastSkin: 'ORIGIN',
};
