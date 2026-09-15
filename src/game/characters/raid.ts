import type { WrestlerConfig } from './types';
import type { MoveDef, Provenance, TauntDef } from '@/game/combat/types';
import { C } from '@/game/config/canon';

/**
 * RAID — six-legged bug-boy created by Squelsh experimentation, accidental child
 * of Gorleenyah, superstar secretly organising against I.B.S. Deck page 11.
 *
 * Archetype: MONSTER / GRAPPLER / CHAOS. He is the opposite of Jassy in every
 * dimension that matters: faster on the ground, far better in the air, longer
 * reach, chattier strings, lower per-hit damage. His spectacle is flying and
 * swarming; hers is throwing people out of the building.
 *
 * PROVENANCE: GAME_ORIGINAL unless marked. The union-themed naming the Bible
 * suggests is flagged "to be approved" there, so it is not on a shipped move.
 */

const G: Provenance = 'GAME_ORIGINAL';
const A: Provenance = 'GAME_ADAPTATION';

const mv = (m: MoveDef): MoveDef => m;

export const RAID: WrestlerConfig = {
  id: 'raid',
  displayName: 'RAID',
  tagline: 'THE TENANT THAT WOULD NOT DIE',
  archetype: 'GRAPPLER',
  alignment: 'FACE',
  canonSummary:
    'A mutant bug created by Squelsh experimentation and the accidental child of '
    + 'Gorleenyah. An I.B.S. superstar who is secretly organising against the network.',
  canonSource: 'DECK_CONFIRMED',
  accent: C.squelsh,

  stats: {
    health: 940,
    speed: 2.45,
    power: 0.97,
    reversal: 0.92,
    itGain: 1.0,
    radius: 0.50,
    height: 1.88,
    air: 1.3,
  },

  moves: {
    /* ---- standing strikes: fast, long, cheap ---- */
    light1: mv({
      id: 'raid_l1', name: 'BUG SWIPE', kind: 'light', clip: 'lightAttack1', provenance: G,
      startupMs: 90, activeMs: 85, recoveryMs: 135,
      damage: 2.4, reach: 1.36, arc: 1.15, knockback: 1.8, hitstunMs: 205,
      itGain: 2, heat: 2, lunge: 1.2, reversible: true,
    }),
    light2: mv({
      id: 'raid_l2', name: 'CHITIN RAKE', kind: 'light', clip: 'lightAttack2', provenance: G,
      startupMs: 95, activeMs: 88, recoveryMs: 145,
      damage: 2.8, reach: 1.40, arc: 1.15, knockback: 2.2, hitstunMs: 225,
      itGain: 2.4, heat: 2.4, lunge: 1.3, reversible: true,
    }),
    light3: mv({
      id: 'raid_l3', name: 'LARVAL LUNGE', kind: 'light', clip: 'lightAttack3', provenance: G,
      startupMs: 110, activeMs: 95, recoveryMs: 160,
      damage: 3.2, reach: 1.52, arc: 1.05, knockback: 3.0, hitstunMs: 265,
      itGain: 3, heat: 3, lunge: 2.2, reversible: true,
    }),
    heavy: mv({
      id: 'raid_heavy', name: 'EXOSKELETON BASH', kind: 'heavy', clip: 'heavyAttack', provenance: G,
      startupMs: 215, activeMs: 130, recoveryMs: 270,
      damage: 13, reach: 1.58, arc: 1.0, knockback: 6.2, hitstunMs: 460,
      knockdown: true, launch: 3.0,
      itGain: 5, heat: 7, lunge: 2.4, reversible: true,
      cameraPunch: 0.9, shout: 'GET OFF MY BUILDING',
    }),

    /* ---- running and the ropes: his department ---- */
    running: mv({
      id: 'raid_run', name: 'SWARM SHOULDER', kind: 'running', clip: 'runningStrike', provenance: G,
      startupMs: 110, activeMs: 150, recoveryMs: 260,
      damage: 15, reach: 1.55, arc: 1.2, knockback: 7.4, hitstunMs: 480,
      knockdown: true, launch: 2.8,
      itGain: 10, heat: 11, lunge: 3.6, reversible: true,
      cameraPunch: 1.0,
    }),
    reboundStrike: mv({
      id: 'raid_reb', name: 'SIX-LEG CROSSBODY', kind: 'rebound', clip: 'reboundStrike', provenance: G,
      startupMs: 105, activeMs: 175, recoveryMs: 290,
      damage: 21, reach: 1.7, arc: 1.3, knockback: 8.6, hitstunMs: 580,
      knockdown: true, launch: 4.4,
      leap: { up: 2.6, forward: 5.2 },
      itGain: 14, heat: 16, lunge: 4.6, reversible: true,
      cameraPunch: 1.4,
    }),
    reboundGrapple: mv({
      id: 'raid_rebg', name: 'INFEST AND DRAG', kind: 'rebound', clip: 'reboundGrapple', provenance: G,
      startupMs: 140, activeMs: 150, recoveryMs: 320,
      damage: 23, reach: 1.55, arc: 1.05, knockback: 5.6, hitstunMs: 680,
      knockdown: true, launch: 5.2,
      itGain: 15, heat: 17, lunge: 3.8, reversible: true,
      shout: 'I LIVE IN THE WALLS',
    }),
    suicideDive: mv({
      id: 'raid_suicide', name: 'THROUGH THE ROPES', kind: 'dive', clip: 'suicideDive', provenance: G,
      startupMs: 160, activeMs: 300, recoveryMs: 520,
      damage: 25, reach: 1.9, arc: 1.5, knockback: 8.0, hitstunMs: 900,
      knockdown: true, launch: 3.4,
      leap: { up: 3.2, forward: 9.4 },
      itGain: 32, heat: 36, reversible: false,
      cameraPunch: 2.0, whiffPenaltyMs: 800, shout: 'INFESTATION',
    }),

    /* ---- corner and top rope ---- */
    cornerAttack: mv({
      id: 'raid_corner', name: 'CORNER SWARM', kind: 'corner', clip: 'cornerAttack', provenance: G,
      startupMs: 150, activeMs: 460, recoveryMs: 240,
      damage: 16, reach: 1.3, arc: 1.35, knockback: 1.2, hitstunMs: 420,
      itGain: 10, heat: 14, reversible: true,
    }),
    topRopeDive: mv({
      id: 'raid_top', name: 'MISSILE MANDIBLE', kind: 'aerial', clip: 'topRopeDive', provenance: G,
      startupMs: 165, activeMs: 360, recoveryMs: 380,
      damage: 29, reach: 1.8, arc: 1.55, knockback: 7.0, hitstunMs: 950,
      knockdown: true, launch: 3.2,
      leap: { up: 6.2, forward: 6.4 },
      itGain: 28, heat: 32, reversible: false,
      cameraPunch: 1.9, hitStopMs: 130, whiffPenaltyMs: 850,
    }),
    topRopeDiveOutside: mv({
      id: 'raid_topout', name: 'THE WHOLE COLONY', kind: 'dive', clip: 'topRopeDive', provenance: G,
      startupMs: 185, activeMs: 440, recoveryMs: 600,
      damage: 27, reach: 2.0, arc: 1.65, knockback: 7.4, hitstunMs: 1150,
      knockdown: true, launch: 2.6,
      leap: { up: 6.6, forward: 10.2 },
      itGain: 36, heat: 44, reversible: false,
      cameraPunch: 2.4, hitStopMs: 160, whiffPenaltyMs: 1100,
      shout: 'EVERYBODY OUT',
    }),

    /* ---- behind them: what turning unlocks ---- */
    backAttack: mv({
      id: 'raid_back', name: 'FROM THE WALLS', kind: 'light', clip: 'backAttack', provenance: G,
      startupMs: 100, activeMs: 95, recoveryMs: 165,
      damage: 10, reach: 1.42, arc: 1.05, knockback: 4.0, hitstunMs: 400,
      itGain: 7, heat: 9, lunge: 1.4, reversible: false,
      cameraPunch: 0.6, shout: 'BEHIND YOU',
    }),
    rearGrapple: mv({
      id: 'raid_reargrab', name: 'LATCH ON', kind: 'grapple', clip: 'rearGrapple', provenance: G,
      startupMs: 125, activeMs: 0, recoveryMs: 210,
      damage: 0, reach: 1.6, arc: 1.4, knockback: 0, hitstunMs: 0,
      itGain: 0, heat: 4, reversible: false,
    }),
    rearThrow: mv({
      id: 'raid_rearthrow', name: 'CARRY THEM OFF', kind: 'throw', clip: 'rearThrow', provenance: G,
      startupMs: 265, activeMs: 150, recoveryMs: 330,
      damage: 26, reach: 1.4, arc: 3.2, knockback: 5.4, hitstunMs: 720,
      knockdown: true, launch: 6.0,
      itGain: 14, heat: 18, reversible: false,
      cameraPunch: 1.3, hitStopMs: 110, shout: 'INTO THE NEST',
      paired: { victimClip: 'takenBack', hold: [0.4, 0.36, 0], releaseAt: 0.7 },
    }),

    /* ---- grappling: long reach, less finish ---- */
    grapple: mv({
      id: 'raid_grab', name: 'INFESTATION', kind: 'grapple', clip: 'grappleStart', provenance: G,
      startupMs: 135, activeMs: 0, recoveryMs: 220,
      // Extra limbs mean he grabs from noticeably further out than Jassy.
      damage: 0, reach: 1.6, arc: 1.3, knockback: 0, hitstunMs: 0,
      itGain: 0, heat: 1, reversible: true,
    }),
    throwForward: mv({
      id: 'raid_tf', name: 'TENANT UPRISING', kind: 'throw', clip: 'throwForward', provenance: G,
      startupMs: 200, activeMs: 120, recoveryMs: 280,
      damage: 14, reach: 1.4, arc: 3.2, knockback: 7.4, hitstunMs: 570,
      knockdown: true, launch: 4.4,
      itGain: 8, heat: 11, reversible: false, shout: 'RENT IS THEFT',
      paired: { victimClip: 'takenFront', hold: [1.0, 0.15, 0], releaseAt: 0.62 },
    }),
    throwBack: mv({
      id: 'raid_tb', name: 'NEST DROP', kind: 'throw', clip: 'throwBack', provenance: G,
      startupMs: 220, activeMs: 130, recoveryMs: 300,
      damage: 17, reach: 1.4, arc: 3.2, knockback: 5.8, hitstunMs: 610,
      knockdown: true, launch: 5.4,
      itGain: 9, heat: 12, reversible: false,
      paired: { victimClip: 'takenBack', hold: [0.6, 0.3, 0], releaseAt: 0.66 },
    }),
    throwCorner: mv({
      id: 'raid_tc', name: 'BOARD THEM IN', kind: 'throw', clip: 'throwForward', provenance: G,
      startupMs: 185, activeMs: 120, recoveryMs: 270,
      damage: 10, reach: 1.4, arc: 3.2, knockback: 13.5, hitstunMs: 680,
      itGain: 7, heat: 9, reversible: false,
    }),
    throwOutside: mv({
      id: 'raid_to', name: 'CURBSIDE COLLECTION', kind: 'throw', clip: 'throwBack', provenance: G,
      startupMs: 230, activeMs: 150, recoveryMs: 380,
      damage: 24, reach: 1.45, arc: 3.2, knockback: 11.5, hitstunMs: 980,
      knockdown: true, launch: 5.8,
      itGain: 16, heat: 22, reversible: false, cameraPunch: 1.5,
      paired: { victimClip: 'takenFront', hold: [1.1, 0.2, 0], releaseAt: 0.6 },
    }),
    irishWhip: mv({
      id: 'raid_whip', name: 'SHOO', kind: 'throw', clip: 'throwForward', provenance: G,
      startupMs: 160, activeMs: 100, recoveryMs: 215,
      damage: 4, reach: 1.4, arc: 3.2, knockback: 16, hitstunMs: 190,
      itGain: 4, heat: 6, reversible: false,
    }),

    /* ---- ground ---- */
    ground: mv({
      id: 'raid_gr', name: 'SWARM STOMP', kind: 'ground', clip: 'groundStrike', provenance: G,
      startupMs: 180, activeMs: 110, recoveryMs: 235,
      damage: 2.6, reach: 1.3, arc: 1.3, knockback: 0.6, hitstunMs: 190,
      itGain: 3, heat: 4, reversible: false,
    }),
    pickUp: mv({
      id: 'raid_pick', name: 'HOIST', kind: 'grapple', clip: 'pickUp', provenance: G,
      startupMs: 200, activeMs: 0, recoveryMs: 160,
      damage: 2, reach: 1.45, arc: 1.5, knockback: 0, hitstunMs: 0,
      itGain: 2, heat: 3, reversible: false,
    }),

    /* ---- the big ones ---- */
    signature: mv({
      id: 'raid_sig', name: 'MUTATION SURGE', kind: 'signature', clip: 'signature', provenance: G,
      startupMs: 255, activeMs: 220, recoveryMs: 320,
      damage: 31, reach: 1.8, arc: 1.3, knockback: 7.5, hitstunMs: 740,
      knockdown: true, launch: 4.2,
      itGain: 0, heat: 26, lunge: 2.6, cost: 50, reversible: true,
      cameraPunch: 1.5, hitStopMs: 140, shout: 'I WAS BUILT IN A LAB',
      paired: { victimClip: 'takenFront', hold: [0.95, 0.18, 0], releaseAt: 0.66 },
    }),
    finisher: mv({
      id: 'raid_fin', name: 'BUGS BITE BACK', kind: 'finisher', clip: 'finisher', provenance: G,
      startupMs: 340, activeMs: 300, recoveryMs: 520,
      damage: 62, reach: 1.9, arc: 1.5, knockback: 8.4, hitstunMs: 1600,
      knockdown: true, launch: 5.6,
      itGain: 0, heat: 50, lunge: 3.0, cost: 100,
      cinematic: true, reversible: false, hitStopMs: 220,
      shout: 'YOU BUILT ME. NOW PAY THE RENT.',
      paired: { victimClip: 'takenFront', hold: [0.9, 0.3, 0], releaseAt: 0.72 },
    }),
  },

  taunts: ((): TauntDef[] => [
    {
      id: 'raid_t_short', name: 'ANTENNA TWITCH', kind: 'short', clip: 'tauntShort', provenance: G,
      durationMs: 560, it: 6, heat: 7, shout: 'SSSSK',
    },
    {
      id: 'raid_t_crowd', name: 'ORGANISE THE ROOM', kind: 'crowd', clip: 'tauntCrowd', provenance: G,
      durationMs: 1500, it: 22, heat: 30, shout: 'SIX LEGS, ONE UNION',
    },
    {
      id: 'raid_t_opp', name: 'INSPECT THE LANDLORD', kind: 'opponent', clip: 'tauntOpponent', provenance: G,
      durationMs: 1050, it: 13, heat: 21, shout: 'YOU CANNOT EVICT ME',
    },
    {
      id: 'raid_t_big', name: 'FULL MOLT', kind: 'big', clip: 'tauntBig', provenance: G,
      durationMs: 1700, it: 26, heat: 33, shout: 'I AM SO MUCH WORSE NOW',
    },
  ])(),

  prop: {
    // GAME_ADAPTATION: Squelsh is the deck's canonical sponsor; an oversized
    // canister of it as a weapon is the game's invention.
    id: 'raid_canister', name: 'THE CANISTER', kind: 'signature', provenance: A,
    shape: 'can', color: C.squelsh, color2: '#E89A2B', scale: 2.4,
    swing: mv({
      id: 'raid_can_swing', name: 'PEST CONTROL', kind: 'prop', clip: 'propSwing', provenance: A,
      startupMs: 200, activeMs: 165, recoveryMs: 380,
      damage: 22, reach: 1.95, arc: 1.2, knockback: 8.0, hitstunMs: 680,
      knockdown: true, launch: 3.2,
      itGain: 18, heat: 26, reversible: true,
      cameraPunch: 1.4, hitStopMs: 120, shout: 'READ THE LABEL',
    }),
  },

  squelsh: {
    id: 'raid_mutation',
    label: 'UNSTABLE BATCH',
    blurb: 'FASTER. LOUDER. EASIER TO HURT.',
    durationMs: 9000,
    damageMult: 1.08,
    speedMult: 1.38,
    itMult: 1.85,
    damageTakenMult: 1.18,
    tint: C.squelsh,
  },

  quotes: {
    entrance: 'YOU BUILT ME IN A LAB. NOW PAY THE RENT.',
    win: 'ORGANISE.',
    taunt: ['SIX LEGS, ONE UNION', 'I LIVE IN THE WALLS', 'YOU CANNOT EVICT ME'],
  },

  rig: {
    proportions: {
      height: 1.88, shoulderW: 0.56, hipW: 0.46,
      torsoLen: 0.64, legLen: 0.80, armLen: 0.72,
      headR: 0.155, neckLen: 0.07, heel: 0.06, hunch: 0.16, bulk: 1.28,
    },
    palette: {
      // A saturated lime bodysuit, not a pale yellow-green: the reference is
      // vivid enough to be the brightest thing in the building.
      skin: '#7BE01F',
      skinShade: '#4E9612',
      hair: '#5A7A1E',
      hairLo: '#3C5411',
      main: C.squelsh,
      alt: '#5FB81C',
      accent: '#F5D021',
      trim: '#9AA0A8',
      boot: '#C8F03A',
      eye: '#D8203A',
    },
    head: { kind: 'insect', mandibles: true, antennae: true, compoundEyes: true },
    costume: {
      top: 'harness', trunks: true, scalePanels: true, collar: true,
      // The yellow lightning bolt across the back is the single clearest
      // identifier in every photograph of this costume.
      backEmblem: 'bolt',
    },
    // Six limbs total: the standard pair plus two more (deck page 11).
    extras: { extraArmPairs: 2, hipProp: 'canister', shoulderPads: true },
  },
};
