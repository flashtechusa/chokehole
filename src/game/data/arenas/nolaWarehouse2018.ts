import type { ArenaConfig } from '@/game/types';

/**
 * THE ORIGINAL WAREHOUSE — New Orleans, 2018.
 *
 * REAL LAYER: Choke Hole began in a New Orleans warehouse in 2018. The exact
 * address/venue is NOT publicly established in the research supplied, so the
 * arena is deliberately a stylised composite and the venue string is a
 * placeholder pending team confirmation.
 *
 * GAME FICTION: hazards, the flickering rig and the crowd behaviour below.
 */
export const NOLA_WAREHOUSE_2018: ArenaConfig = {
  id: 'nola-warehouse-2018',
  displayName: 'THE ORIGINAL WAREHOUSE',
  genericName: 'DIY WAREHOUSE (NEW ORLEANS)',
  city: 'NEW ORLEANS, LA',
  history: {
    eventName: 'CHOKE HOLE — ORIGIN ERA',
    venue: 'VENUE TBD — TEAM CONFIRMATION REQUIRED',
    city: 'New Orleans, LA',
    date: '2018',
    note:
      'Choke Hole started in a New Orleans warehouse in 2018, out of the city’s ' +
      'underground queer party scene. The exact address is not established in the ' +
      'public research collected so far, so this arena is a stylised composite ' +
      'rather than a recreation of a specific room.',
    research: 'CONFIRMED; DETAIL TBD',
    sources: ['https://www.chokehole.com/'],
  },
  vibe: 'Homemade ring, scaffold rig, cheap gels, the crowd standing on the apron. Cramped and dangerous.',
  palette: {
    skyTop: 0x1a0d1e,
    skyBottom: 0x0b060f,
    haze: 0xff2d95,
    structure: 0x4a3448,
    structureDark: 0x241726,
    crowd: 0x1b1020,
    crowdGlow: 0xff2d95,
    matCanvas: 0xe7d9c4,
    matLogo: 0xff2d95,
    apron: 0x2a1030,
    ropes: [0xff2d95, 0xf3e9dd, 0xff7a1a],
    posts: 0xffd23f,
    lightWarm: 0xff7a1a,
    lightCool: 0x31e7ff,
    floor: 0x150b17,
  },
  backdrop: [
    { kind: 'brickwall', parallax: 0.12, y: 0, height: 250, tint: 0x3a2436, tint2: 0x241726 },
    { kind: 'graffiti', parallax: 0.14, y: 118, density: 5, tint: 0xff2d95, tint2: 0xb6ff3a },
    { kind: 'rafters', parallax: 0.2, y: 0, height: 118, tint: 0x2c1c2e },
    { kind: 'trussLights', parallax: 0.24, y: 40, density: 7, tint: 0xff7a1a, tint2: 0x31e7ff },
    { kind: 'banners', parallax: 0.3, y: 150, density: 2, tint: 0xff2d95, tint2: 0xffd23f },
    { kind: 'crowd', parallax: 0.52, y: 262, density: 34, tint: 0x1b1020, tint2: 0xff2d95 },
  ],
  ringHalfWidth: 372,
  ringDepth: 92,
  crowdIntensity: 1.0,
  event: {
    kind: 'lightFlicker',
    label: 'BAD WIRING',
    description:
      'GAME FICTION: at high crowd HEAT the DIY lighting rig browns out and strobes, ' +
      'and the crowd leans in over the ropes.',
  },
  unlock: { kind: 'default', label: 'AVAILABLE' },
  broadcastSkin: 'ORIGIN',
};
