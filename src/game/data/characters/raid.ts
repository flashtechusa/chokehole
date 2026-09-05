import type { WrestlerConfig } from '@/game/types';
import { C } from '@/game/config/palette';

/**
 * RAID — vertical-slice fighter #2.
 *
 * REAL LAYER (public sources): RAID is a Choke Hole persona built around a
 * mutant-insect character created by laboratory experimentation, used as the
 * tenant/underdog side of the documented anti-gentrification rivalry with Jassy.
 * Costume, prop and catchphrase specifics still need performer sign-off.
 *
 * GAME FICTION: all moves, stats, buffs and quotes below are original to this game.
 */
export const RAID: WrestlerConfig = {
  id: 'raid',
  displayName: 'RAID',
  tagline: 'THE TENANT THAT WOULD NOT DIE',
  publicPersonaSummary:
    'Choke Hole persona: a mutant bug created by laboratory experimentation, ' +
    'fighting as the tenant/underdog against the landlord character Jassy. ' +
    'Insectoid costume language, extra limbs, chemical and pest-control iconography.',
  personaResearch: 'TEAM CONFIRMATION REQUIRED',
  archetype: 'GRAPPLER',
  alignment: 'FACE',

  stats: {
    health: 132,
    speed: 172,
    power: 0.94,
    grapple: 1.34,
    reversal: 1.18,
    squelshGain: 1.16,
  },

  moves: {
    light: {
      id: 'raid_light', name: 'BUG SWIPE', kind: 'light',
      startup: 88, active: 90, recovery: 130,
      damage: 5.2, reach: 78, depthTolerance: 34, knockback: 70, hitstun: 210,
      squelsh: 4.6, heat: 2.4, lunge: 26, shake: 0.0018,
      impactTint: C.acid, callout: 'BUG SWIPE',
    },
    heavy: {
      id: 'raid_heavy', name: 'EXOSKELETON BASH', kind: 'heavy',
      startup: 265, active: 120, recovery: 300,
      damage: 13, reach: 84, depthTolerance: 38, knockback: 240, hitstun: 480,
      knockdown: true, launch: 180,
      squelsh: 10, heat: 7, lunge: 150, shake: 0.007,
      impactTint: C.acid, callout: 'EXOSKELETON BASH',
    },
    grapple: {
      id: 'raid_grapple', name: "TENANT'S REVENGE", kind: 'grapple',
      startup: 150, active: 130, recovery: 260,
      damage: 18, reach: 70, depthTolerance: 34, knockback: 300, hitstun: 700,
      knockdown: true, launch: 320,
      squelsh: 13, heat: 10, shake: 0.009,
      impactTint: C.cyan, callout: "TENANT'S REVENGE",
    },
    signature: {
      id: 'raid_sig', name: 'MUTATION SURGE', kind: 'signature',
      startup: 260, active: 180, recovery: 300,
      damage: 12, reach: 118, depthTolerance: 52, knockback: 220, hitstun: 520,
      squelsh: 0, heat: 20, lunge: 90, shake: 0.008, cost: 50,
      impactTint: C.acid, callout: 'MUTATION SURGE',
      buff: {
        id: 'raid_mutated', label: 'MUTATED', durationMs: 8500,
        powerMult: 1.16, reachMult: 1.35, speedMult: 1.12,
        damageTakenMult: 0.78, squelshGainMult: 1.3, tint: C.acid,
      },
    },
    finisher: {
      id: 'raid_fin', name: 'BUGS BITE BACK', kind: 'finisher',
      startup: 380, active: 320, recovery: 600,
      damage: 38, reach: 108, depthTolerance: 56, knockback: 380, hitstun: 1500,
      knockdown: true, launch: 520,
      squelsh: 0, heat: 42, lunge: 300, shake: 0.02, cost: 100,
      impactTint: C.acid, callout: 'BUGS BITE BACK',
    },
  },

  lightAlt: {
    id: 'raid_light2', name: 'MANDIBLE SNAP', kind: 'light',
    startup: 96, active: 95, recovery: 165,
    damage: 6.4, reach: 82, depthTolerance: 34, knockback: 130, hitstun: 280,
    squelsh: 5.4, heat: 3.2, lunge: 40, shake: 0.0026,
    impactTint: C.cyan, callout: 'MANDIBLE SNAP',
  },

  prop: {
    name: 'THE CANISTER',
    mechanic: 'Vents pressurised mutagen during MUTATION SURGE; extends reach and armour.',
    // Placeholder prop -- no prop is visible in the supplied reference.
    // TEAM CONFIRMATION REQUIRED on what RAID actually carries.
    shape: 'none',
    color: C.acid,
    color2: 0x1c3a12,
  },

  rig: {
    scale: 1.0, bulk: 1.1,

    // Matched to performer-supplied reference photography. The reference images
    // are NOT shipped or traced -- colours and shapes were read off them by hand.
    skin: 0x9bef2b,        // neon lime bodysuit / limbs
    outfit: 0x9aa0a8,      // grey reptile-scale torso plate
    outfitAlt: 0x8ce60f,   // neon green legs
    trim: 0xf5d020,        // yellow claws and trim
    boots: 0x8ce60f,       // legs stay green down to the trainers
    gloves: 0xf5d020,      // yellow claws
    hair: 0xf09a7a,
    rim: 0xc8ff3a,
    aura: 0xb6ff3a,

    // Lower and wider than Jassy, and flat-footed in trainers rather than heels.
    figure: { shoulders: 1.26, bust: 0.32, waist: 0.86, hips: 1.12, legs: 1.0, heel: 0 },

    // No wig: the head is a sculpted creature mask.
    wig: { style: 'none', volume: 1, color: 0xf09a7a },

    // Huge lipsticked maw full of jagged teeth, small eyes riding above it.
    face: {
      kind: 'maw',
      lash: 0x1b2410, brow: 0x1b2410,
      lip: 0xe8607a,       // heavy pink lips around the mouth
      shadow: 0x3f7fd0,    // blue skull patches
      teeth: 0xf2e8c0,
      maw: 0x2a1420,
    },

    costume: {
      kind: 'bodysuit',
      scalePanel: 0x9aa0a8,     // grey snakeskin plate
      bolt: 0xf5e31b,           // yellow lightning bolt across it
      trunks: 0xe89a2b,         // shiny amber trunks over the suit
      kneePads: 0x5a5f66,
      sneakers: 0xc8f03a,       // yellow-green trainers
      sneakerStripe: 0x141414,
      longGloves: false,
      longBoots: false,
    },

    flourishes: [
      // fan of soft salmon spines off the skull
      { kind: 'crest', color: 0xf09a7a, color2: 0xf5c0a8, count: 8, scale: 1.05 },
      // four extra clawed arms at the waist -- the signature silhouette
      { kind: 'extraArms', color: 0x8ce60f, color2: 0xf5d020, scale: 0.92, count: 4 },
    ],
  },

  audio: { pitch: 0.86, grit: 0.72, hype: 0.6 },

  quotes: {
    entrance: 'YOU BUILT ME IN A LAB. NOW PAY THE RENT.',
    taunt: ['STILL HERE', 'CANNOT BE EVICTED', 'SIX LEGS. ONE LEASE.'],
    win: ['TENANTS UNION.', 'SPRAY ME AGAIN. I DARE YOU.', 'THE BUILDING IS OURS.'],
    lose: 'I WILL REGROW.',
  },

  venueBonus: [
    {
      arenaId: 'nola-warehouse-2018',
      heatMult: 1.2,
      note: 'GAME FICTION: the original warehouse crowd is on the tenant side.',
    },
  ],

  unlock: { kind: 'default', label: 'AVAILABLE' },
};
