import type { WrestlerConfig } from './types';
import type { MoveDef, Provenance, TauntDef } from '@/game/combat/types';
import { C } from '@/game/config/canon';

/**
 * JASSY — billionaire "SHE-E-O" of H.E.R., founder of the rival CHOKE H.E.R.
 * fight club. Deck pages 10 and 14.
 *
 * Archetype: POWER / HEEL / CORPORATE CONTROL. Slower than RAID on the ground
 * and worse in the air, but the best grappler in the game and the heaviest
 * single hits. Her spectacle comes from throwing people places, not from flying.
 *
 * PROVENANCE: every move below is GAME_ORIGINAL or a GAME_ADAPTATION of imagery
 * the deck establishes. Nothing here claims to be a spot she actually performs;
 * REAL_VERIFIED entries get added only from footage or performer confirmation.
 */

const G: Provenance = 'GAME_ORIGINAL';
const A: Provenance = 'GAME_ADAPTATION';

const mv = (m: MoveDef): MoveDef => m;

export const JASSY: WrestlerConfig = {
  id: 'jassy',
  displayName: 'JASSY',
  tagline: 'THE SHE-E-O',
  archetype: 'POWER',
  alignment: 'HEEL',
  canonSummary:
    'Billionaire SHE-E-O of H.E.R. who owns almost all of Earth, and founder of '
    + 'CHOKE H.E.R. — a conservative fight club built from CHOKE HOLE rejects.',
  canonSource: 'DECK_CONFIRMED',
  accent: C.pink,

  stats: {
    health: 900,
    speed: 2.02,
    power: 1.2,
    reversal: 1.08,
    itGain: 1.12,
    radius: 0.42,
    height: 1.95,
    air: 0.82,
  },

  moves: {
    /* ---- standing strikes ---- */
    light1: mv({
      id: 'jassy_l1', name: 'EXECUTIVE SLAP', kind: 'light', clip: 'lightAttack1', provenance: G,
      startupMs: 115, activeMs: 90, recoveryMs: 165,
      damage: 3, reach: 1.18, arc: 1.0, knockback: 2.4, hitstunMs: 250,
      itGain: 2, heat: 2, lunge: 0.9, reversible: true,
    }),
    light2: mv({
      id: 'jassy_l2', name: 'PORTFOLIO BACKHAND', kind: 'light', clip: 'lightAttack2', provenance: G,
      startupMs: 125, activeMs: 95, recoveryMs: 180,
      damage: 3.4, reach: 1.22, arc: 1.0, knockback: 3.0, hitstunMs: 275,
      itGain: 2.5, heat: 2.4, lunge: 1.0, reversible: true,
    }),
    light3: mv({
      id: 'jassy_l3', name: 'CLOSING COSTS', kind: 'light', clip: 'lightAttack3', provenance: G,
      startupMs: 135, activeMs: 100, recoveryMs: 195,
      damage: 3.8, reach: 1.26, arc: 0.95, knockback: 3.6, hitstunMs: 310,
      itGain: 3, heat: 3, lunge: 1.1, reversible: true,
    }),
    heavy: mv({
      id: 'jassy_heavy', name: 'MARKET CRASH', kind: 'heavy', clip: 'heavyAttack', provenance: G,
      startupMs: 245, activeMs: 120, recoveryMs: 310,
      damage: 15, reach: 1.42, arc: 0.9, knockback: 7.0, hitstunMs: 500,
      knockdown: true, launch: 3.2,
      itGain: 5, heat: 7, lunge: 1.8, reversible: true,
      cameraPunch: 1, shout: 'THE MARKET HAS SPOKEN',
    }),

    /* ---- running and the ropes ---- */
    running: mv({
      id: 'jassy_run', name: 'HOSTILE CLOTHESLINE', kind: 'running', clip: 'runningStrike', provenance: G,
      startupMs: 130, activeMs: 150, recoveryMs: 300,
      damage: 17, reach: 1.5, arc: 1.15, knockback: 8.2, hitstunMs: 520,
      knockdown: true, launch: 3.0,
      itGain: 10, heat: 11, lunge: 3.0, reversible: true,
      cameraPunch: 1.1, shout: 'GET OUT OF MY LOBBY',
    }),
    reboundStrike: mv({
      id: 'jassy_reb', name: 'LEVERAGED BUYOUT', kind: 'rebound', clip: 'reboundStrike', provenance: G,
      startupMs: 120, activeMs: 165, recoveryMs: 330,
      damage: 23, reach: 1.6, arc: 1.2, knockback: 9.4, hitstunMs: 600,
      knockdown: true, launch: 3.8,
      itGain: 13, heat: 15, lunge: 4.2, reversible: true,
      cameraPunch: 1.4,
    }),
    reboundGrapple: mv({
      id: 'jassy_rebg', name: 'REPOSSESSION', kind: 'rebound', clip: 'reboundGrapple', provenance: G,
      startupMs: 150, activeMs: 150, recoveryMs: 360,
      damage: 25, reach: 1.45, arc: 1.0, knockback: 6.0, hitstunMs: 700,
      knockdown: true, launch: 5.0,
      itGain: 14, heat: 16, lunge: 3.4, reversible: true,
      cameraPunch: 1.4, shout: 'THAT IS MINE NOW',
    }),
    suicideDive: mv({
      // Jassy is not an aerialist; hers is a shove through the ropes, and the
      // comedy is that she lands badly.
      id: 'jassy_suicide', name: 'GOLDEN PARACHUTE', kind: 'dive', clip: 'suicideDive', provenance: G,
      startupMs: 210, activeMs: 260, recoveryMs: 620,
      damage: 22, reach: 1.7, arc: 1.4, knockback: 7.0, hitstunMs: 800,
      knockdown: true, launch: 3.0,
      leap: { up: 3.4, forward: 7.2 },
      itGain: 28, heat: 32, reversible: false,
      cameraPunch: 1.8, whiffPenaltyMs: 900, shout: 'I AM INSURED',
    }),

    /* ---- corner and top rope ---- */
    cornerAttack: mv({
      id: 'jassy_corner', name: 'BOARDROOM MOUNT', kind: 'corner', clip: 'cornerAttack', provenance: G,
      startupMs: 180, activeMs: 420, recoveryMs: 280,
      damage: 15, reach: 1.25, arc: 1.3, knockback: 1.2, hitstunMs: 420,
      itGain: 9, heat: 13, reversible: true,
      shout: 'COUNT THEM WITH ME',
    }),
    topRopeDive: mv({
      id: 'jassy_top', name: 'LIQUIDATION DROP', kind: 'aerial', clip: 'topRopeDive', provenance: G,
      startupMs: 200, activeMs: 340, recoveryMs: 460,
      damage: 30, reach: 1.7, arc: 1.5, knockback: 5.0, hitstunMs: 900,
      knockdown: true, launch: 2.4,
      leap: { up: 5.2, forward: 4.6 },
      itGain: 26, heat: 30, reversible: false,
      cameraPunch: 1.8, hitStopMs: 130, whiffPenaltyMs: 1000,
    }),
    topRopeDiveOutside: mv({
      id: 'jassy_topout', name: 'ASSET DUMP', kind: 'dive', clip: 'topRopeDive', provenance: G,
      startupMs: 220, activeMs: 420, recoveryMs: 700,
      damage: 26, reach: 1.9, arc: 1.6, knockback: 6.0, hitstunMs: 1100,
      knockdown: true, launch: 2.0,
      leap: { up: 5.8, forward: 7.6 },
      itGain: 34, heat: 40, reversible: false,
      cameraPunch: 2.2, hitStopMs: 150, whiffPenaltyMs: 1300,
      shout: 'TIMBER',
    }),

    /* ---- behind them: what turning unlocks ---- */
    backAttack: mv({
      id: 'jassy_back', name: 'BLINDSIDE APPRAISAL', kind: 'light', clip: 'backAttack', provenance: G,
      startupMs: 120, activeMs: 95, recoveryMs: 190,
      damage: 12, reach: 1.24, arc: 1.0, knockback: 4.4, hitstunMs: 420,
      itGain: 7, heat: 9, lunge: 1.1, reversible: false,
      cameraPunch: 0.6, shout: 'DID NOT SEE ME COMING',
    }),
    rearGrapple: mv({
      id: 'jassy_reargrab', name: 'BACK TAXES', kind: 'grapple', clip: 'rearGrapple', provenance: G,
      startupMs: 150, activeMs: 0, recoveryMs: 240,
      damage: 0, reach: 1.32, arc: 1.3, knockback: 0, hitstunMs: 0,
      itGain: 0, heat: 4, reversible: false,
    }),
    rearThrow: mv({
      id: 'jassy_rearthrow', name: 'REVERSE MORTGAGE', kind: 'throw', clip: 'rearThrow', provenance: G,
      startupMs: 300, activeMs: 150, recoveryMs: 380,
      damage: 28, reach: 1.3, arc: 3.2, knockback: 5.0, hitstunMs: 760,
      knockdown: true, launch: 5.6,
      itGain: 14, heat: 18, reversible: false,
      cameraPunch: 1.3, hitStopMs: 110, shout: 'SIGN HERE',
      paired: { victimClip: 'takenBack', hold: [0.35, 0.34, 0], releaseAt: 0.7 },
    }),

    /* ---- grappling: her department ---- */
    grapple: mv({
      id: 'jassy_grab', name: 'TENANCY REVIEW', kind: 'grapple', clip: 'grappleStart', provenance: G,
      startupMs: 165, activeMs: 0, recoveryMs: 250,
      damage: 0, reach: 1.3, arc: 1.15, knockback: 0, hitstunMs: 0,
      itGain: 0, heat: 1, reversible: true,
    }),
    throwForward: mv({
      id: 'jassy_tf', name: 'EVICTION NOTICE', kind: 'throw', clip: 'throwForward', provenance: G,
      startupMs: 235, activeMs: 120, recoveryMs: 330,
      damage: 16, reach: 1.3, arc: 3.2, knockback: 6.4, hitstunMs: 600,
      knockdown: true, launch: 4.0,
      itGain: 8, heat: 10, reversible: false, shout: 'THIRTY DAYS',
      paired: { victimClip: 'takenFront', hold: [0.95, 0.15, 0], releaseAt: 0.62 },
    }),
    throwBack: mv({
      id: 'jassy_tb', name: 'ASSET STRIPPING', kind: 'throw', clip: 'throwBack', provenance: G,
      startupMs: 255, activeMs: 130, recoveryMs: 350,
      damage: 19, reach: 1.3, arc: 3.2, knockback: 5.2, hitstunMs: 650,
      knockdown: true, launch: 4.8,
      itGain: 9, heat: 12, reversible: false,
      paired: { victimClip: 'takenBack', hold: [0.55, 0.3, 0], releaseAt: 0.66 },
    }),
    throwCorner: mv({
      id: 'jassy_tc', name: 'RELOCATION ORDER', kind: 'throw', clip: 'throwForward', provenance: G,
      startupMs: 210, activeMs: 120, recoveryMs: 300,
      damage: 11, reach: 1.3, arc: 3.2, knockback: 13, hitstunMs: 700,
      itGain: 7, heat: 9, reversible: false,
    }),
    throwOutside: mv({
      id: 'jassy_to', name: 'OFFSHORE HOLDING', kind: 'throw', clip: 'throwBack', provenance: G,
      startupMs: 260, activeMs: 150, recoveryMs: 420,
      damage: 26, reach: 1.35, arc: 3.2, knockback: 11, hitstunMs: 1000,
      knockdown: true, launch: 5.6,
      itGain: 16, heat: 22, reversible: false,
      cameraPunch: 1.5, shout: 'OFF MY PROPERTY',
      paired: { victimClip: 'takenFront', hold: [1.05, 0.2, 0], releaseAt: 0.6 },
    }),
    irishWhip: mv({
      id: 'jassy_whip', name: 'MARKET FORCES', kind: 'throw', clip: 'throwForward', provenance: G,
      startupMs: 180, activeMs: 100, recoveryMs: 240,
      damage: 5, reach: 1.3, arc: 3.2, knockback: 15, hitstunMs: 200,
      itGain: 4, heat: 6, reversible: false,
    }),

    /* ---- ground ---- */
    ground: mv({
      id: 'jassy_gr', name: 'FORECLOSURE', kind: 'ground', clip: 'groundStrike', provenance: G,
      startupMs: 215, activeMs: 110, recoveryMs: 280,
      damage: 3, reach: 1.15, arc: 1.2, knockback: 0.6, hitstunMs: 200,
      itGain: 3, heat: 4, reversible: false,
    }),
    pickUp: mv({
      id: 'jassy_pick', name: 'REINSTATEMENT', kind: 'grapple', clip: 'pickUp', provenance: G,
      startupMs: 240, activeMs: 0, recoveryMs: 180,
      damage: 2, reach: 1.3, arc: 1.4, knockback: 0, hitstunMs: 0,
      itGain: 2, heat: 3, reversible: false,
    }),

    /* ---- the big ones ---- */
    signature: mv({
      id: 'jassy_sig', name: 'HOSTILE ACQUISITION', kind: 'signature', clip: 'signature', provenance: G,
      startupMs: 300, activeMs: 200, recoveryMs: 380,
      damage: 34, reach: 1.55, arc: 1.1, knockback: 8, hitstunMs: 780,
      knockdown: true, launch: 4.4,
      itGain: 0, heat: 26, lunge: 2.0, cost: 50, reversible: true,
      cameraPunch: 1.6, hitStopMs: 150, shout: 'CONSIDER YOURSELF ACQUIRED',
      paired: { victimClip: 'takenFront', hold: [0.9, 0.18, 0], releaseAt: 0.66 },
    }),
    finisher: mv({
      id: 'jassy_fin', name: 'HOSTILE TAKEOVER', kind: 'finisher', clip: 'finisher', provenance: G,
      startupMs: 380, activeMs: 280, recoveryMs: 560,
      damage: 66, reach: 1.75, arc: 1.4, knockback: 9, hitstunMs: 1600,
      knockdown: true, launch: 6.0,
      itGain: 0, heat: 50, lunge: 2.4, cost: 100,
      cinematic: true, reversible: false, hitStopMs: 220,
      shout: 'THE PROPERTY HAS BEEN ACQUIRED',
      paired: { victimClip: 'takenFront', hold: [0.85, 0.3, 0], releaseAt: 0.72 },
    }),
  },

  taunts: ((): TauntDef[] => [
    {
      id: 'jassy_t_short', name: 'CHECK THE WATCH', kind: 'short', clip: 'tauntShort', provenance: G,
      durationMs: 620, it: 6, heat: 6, shout: 'IS THIS STILL GOING?',
    },
    {
      id: 'jassy_t_crowd', name: 'ADDRESS THE SHAREHOLDERS', kind: 'crowd', clip: 'tauntCrowd', provenance: G,
      durationMs: 1550, it: 21, heat: 26, shout: 'I OWN EVERY SEAT YOU ARE SITTING IN',
    },
    {
      id: 'jassy_t_opp', name: 'APPRAISE THE TENANT', kind: 'opponent', clip: 'tauntOpponent', provenance: G,
      durationMs: 1100, it: 13, heat: 20, shout: 'THIS IS A TEARDOWN',
    },
    {
      id: 'jassy_t_big', name: 'THE SHE-E-O POSE', kind: 'big', clip: 'tauntBig', provenance: G,
      durationMs: 1750, it: 25, heat: 30, shout: 'LOOK WHAT I BOUGHT',
    },
  ])(),

  prop: {
    // GAME_ADAPTATION: the deck and the supplied reference photography show her
    // with a brick phone. Scaling it to an absurd size is the game's invention.
    id: 'jassy_phone', name: 'THE GIANT PHONE', kind: 'signature', provenance: A,
    shape: 'phone', color: '#E8B33A', color2: '#2A2018', scale: 2.6,
    swing: mv({
      id: 'jassy_phone_swing', name: 'CONFERENCE CALL', kind: 'prop', clip: 'propSwing', provenance: A,
      startupMs: 230, activeMs: 160, recoveryMs: 420,
      damage: 24, reach: 1.9, arc: 1.15, knockback: 8.5, hitstunMs: 700,
      knockdown: true, launch: 3.4,
      itGain: 18, heat: 26, reversible: true,
      cameraPunch: 1.5, hitStopMs: 120, shout: 'HOLD, PLEASE',
    }),
  },

  squelsh: {
    id: 'jassy_liquidity',
    label: 'LIQUIDITY EVENT',
    blurb: 'SLOWER. RICHER. MEANER.',
    durationMs: 9000,
    damageMult: 1.34,
    speedMult: 0.84,
    itMult: 1.7,
    damageTakenMult: 1,
    tint: C.acid,
  },

  quotes: {
    entrance: 'I OWN THE BUILDING. I OWN THE RING. I OWN YOU.',
    win: 'CLOSING COSTS.',
    taunt: ['YOUR LEASE IS UP', 'I HAVE COMPS', 'THIS IS A TEARDOWN'],
  },

  rig: {
    proportions: {
      height: 1.95, shoulderW: 0.44, hipW: 0.42,
      torsoLen: 0.60, legLen: 0.90, armLen: 0.66,
      headR: 0.135, neckLen: 0.10, heel: 0.16, hunch: 0.03, bulk: 1.0,
    },
    palette: {
      skin: '#F3DCC8',
      skinShade: '#E0C2AC',
      /*
       * A blonde bouffant over a dark under-layer, per the reference shots.
       * This was near-black for most of development off a misread of the
       * photographs: the hair is a two-tone wig, yellow on top and dark
       * underneath and through the fringe, and the yellow is most of what makes
       * her recognisable at a glance.
       */
      hair: '#F2C33C',
      hairLo: '#3A2418',
      /*
       * Black patent. It was lifted to a dark purple because a black costume
       * vanished against a dim stage — but that was before the ink outline and
       * the rim light, and the line is what separates her from the background
       * now. The reference is black latex and it can be black latex.
       */
      main: '#17101E',
      alt: '#332438',
      accent: C.pink,
      trim: '#F261A9',
      boot: '#1A1220',
      eye: '#120A14',
    },
    head: { kind: 'glam', wig: 'bouffant', lashes: true, lips: true },
    costume: {
      top: 'leotard', puffSleeves: true, gloves: true, beltBuckle: true,
      // The pink jacket runs to the wrist, and there is a black tie over a
      // pink collar down the front of the bodysuit.
      longSleeves: true, tie: true,
    },
    extras: { hipProp: 'brickphone', shoulderPads: false },
  },
};
