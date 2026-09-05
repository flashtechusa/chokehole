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
    shape: 'canister',
    color: C.acid,
    color2: 0x1c3a12,
  },

  rig: {
    scale: 1.0, bulk: 1.14,
    skin: 0x7be04a,
    outfit: 0x2fa84f,
    outfitAlt: 0x35d0a0,
    trim: 0xb6ff3a,
    boots: 0x1d4a2c,
    gloves: 0x31e7ff,
    hair: 0x0f3d20,
    rim: 0xb6ff3a,
    aura: 0xb6ff3a,

    // Mutant-insect drag: a lower, wider, harder silhouette than Jassy --
    // chitin plating, stompier boots, an actual bug head.
    figure: { shoulders: 1.26, bust: 1.1, waist: 0.78, hips: 1.2, legs: 0.96, heel: 6 },
    wig: { style: 'mohawk', volume: 0.95, color: 0xb6ff3a, color2: 0x31e7ff },
    face: { kind: 'insect', lash: 0x0d1a08, lip: 0x0d1a08, brow: 0x0d1a08, shadow: 0xb6ff3a },
    costume: {
      kind: 'harness',
      fringe: 0x35d0a0,
      longGloves: false,
      longBoots: true,
    },

    flourishes: [
      { kind: 'carapace', color: 0x2fa84f, color2: 0xb6ff3a },
      { kind: 'extraArms', color: 0x2fa84f, color2: 0xb6ff3a, scale: 0.8 },
      { kind: 'antennae', color: 0xb6ff3a, color2: 0x31e7ff, scale: 1.15 },
      { kind: 'mandibles', color: 0xb6ff3a },
      { kind: 'wings', color: 0x35d0a0 },
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
