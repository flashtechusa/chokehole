import type { WrestlerConfig } from '@/game/types';
import { C } from '@/game/config/palette';

/**
 * JASSY — vertical-slice fighter #1.
 *
 * REAL LAYER (public sources): Jassy is a founding Choke Hole performer whose
 * persona is a billionaire "SHE-E-O" / landlord character — a capitalist villain
 * archetype used in the show's gentrification storylines, including the
 * documented rivalry with RAID. Costume/prop specifics, catchphrases and the
 * final spelling of the name still need performer sign-off.
 *
 * GAME FICTION: every move name, stat, buff and quote below is written for this
 * game. None of it is a claim about a real match or a real stunt.
 */
export const JASSY: WrestlerConfig = {
  id: 'jassy',
  displayName: 'JASSY',
  tagline: 'THE SHE-E-O',
  publicPersonaSummary:
    'Founding Choke Hole performer. Plays a billionaire landlord / "SHE-E-O" heel: ' +
    'corporate villainy, eviction humour and hostile takeovers, and a long-running ' +
    'on-stage rivalry with the mutant tenant RAID.',
  personaResearch: 'TEAM CONFIRMATION REQUIRED',
  archetype: 'POWER',
  alignment: 'HEEL',

  stats: {
    health: 118,
    speed: 158,
    power: 1.22,
    grapple: 1.14,
    reversal: 0.92,
    squelshGain: 1.0,
  },

  moves: {
    light: {
      id: 'jassy_light', name: 'EXECUTIVE SLAP', kind: 'light',
      startup: 105, active: 80, recovery: 155,
      damage: 6.5, reach: 62, depthTolerance: 26, knockback: 92, hitstun: 240,
      squelsh: 4, heat: 2.2, lunge: 40, shake: 0.0022,
      impactTint: C.pink, callout: 'EXECUTIVE SLAP',
    },
    heavy: {
      id: 'jassy_heavy', name: 'MARKET CRASH', kind: 'heavy',
      startup: 300, active: 110, recovery: 330,
      damage: 16, reach: 76, depthTolerance: 30, knockback: 280, hitstun: 520,
      knockdown: true, launch: 210,
      squelsh: 9, heat: 7, lunge: 120, shake: 0.008,
      impactTint: C.orange, callout: 'MARKET CRASH!!',
    },
    grapple: {
      id: 'jassy_grapple', name: 'EVICTION NOTICE', kind: 'grapple',
      startup: 170, active: 120, recovery: 300,
      damage: 15, reach: 62, depthTolerance: 30, knockback: 330, hitstun: 620,
      knockdown: true, launch: 260,
      squelsh: 11, heat: 8.5, shake: 0.0075,
      impactTint: C.gold, callout: 'EVICTION NOTICE — 30 DAYS',
    },
    signature: {
      id: 'jassy_sig', name: 'GENTRIFICATION STATION', kind: 'signature',
      startup: 340, active: 220, recovery: 380,
      damage: 21, reach: 104, depthTolerance: 44, knockback: 360, hitstun: 760,
      knockdown: true, launch: 250,
      squelsh: 0, heat: 20, lunge: 190, shake: 0.011, cost: 50,
      impactTint: C.gold, callout: 'GENTRIFICATION STATION',
      buff: {
        id: 'jassy_acquired', label: 'ACQUIRED', durationMs: 7000,
        powerMult: 1.24, damageTakenMult: 0.86, tint: C.gold,
      },
    },
    finisher: {
      id: 'jassy_fin', name: 'HOSTILE TAKEOVER', kind: 'finisher',
      startup: 420, active: 300, recovery: 620,
      damage: 40, reach: 116, depthTolerance: 56, knockback: 420, hitstun: 1500,
      knockdown: true, launch: 420,
      squelsh: 0, heat: 42, lunge: 240, shake: 0.02, cost: 100,
      impactTint: C.pink, callout: 'HOSTILE TAKEOVER',
    },
  },

  lightAlt: {
    id: 'jassy_light2', name: 'PORTFOLIO BACKHAND', kind: 'light',
    startup: 120, active: 85, recovery: 190,
    damage: 8, reach: 68, depthTolerance: 26, knockback: 150, hitstun: 300,
    squelsh: 5, heat: 3, lunge: 55, shake: 0.003,
    impactTint: C.pink, callout: 'PORTFOLIO BACKHAND',
  },

  prop: {
    name: 'THE BRIEFCASE',
    mechanic: 'Signature swings the case; on hit it stamps a SOLD sign into the mat.',
    shape: 'briefcase',
    color: C.gold,
    color2: C.ink,
  },

  rig: {
    scale: 1.06, bulk: 1.1,
    skin: 0xf2c9a8,
    outfit: 0xff2d95,
    outfitAlt: 0xff7a1a,
    trim: 0xffd23f,
    boots: 0x4a1440,
    gloves: 0xffd23f,
    hair: 0xffb3e0,
    rim: 0xffd23f,
    aura: 0xffd23f,

    // Corporate-villain drag silhouette: padded shoulders, cinched waist,
    // huge hips and towering platforms. Reads as a landlord from across a room.
    figure: { shoulders: 1.22, bust: 1.5, waist: 0.66, hips: 1.42, legs: 1.06, heel: 11 },
    wig: { style: 'bouffant', volume: 1.2, color: 0xffb3e0, color2: 0xffd23f },
    face: { kind: 'glam', lash: 0x2a1030, lip: 0xe01860, brow: 0x2a1030, shadow: 0xff7a1a },
    costume: {
      kind: 'blazer',
      belt: 0xffd23f,
      longGloves: true,
      longBoots: true,
    },

    flourishes: [
      { kind: 'shoulderpads', color: 0xff7a1a, color2: 0xffd23f, scale: 1.3 },
      { kind: 'sash', color: 0xffd23f },
    ],
  },

  audio: { pitch: 1.06, grit: 0.25, hype: 0.8 },

  quotes: {
    entrance: 'I OWN THE BUILDING. I OWN THE RING. I OWN YOU.',
    taunt: ['THIS IS A BUSINESS', 'YOUR LEASE IS UP', 'I HAVE COMPS'],
    win: ['ASSET ACQUIRED.', 'THE MARKET DECIDED.', 'CLOSING COSTS.'],
    lose: 'MY LAWYERS WILL BE IN TOUCH.',
  },

  venueBonus: [
    {
      arenaId: 'superchief-2019',
      heatMult: 1.25,
      note: 'GAME FICTION: the landlord-vs-tenant story pops hardest in a New York gallery warehouse.',
    },
  ],

  unlock: { kind: 'default', label: 'AVAILABLE' },
};
