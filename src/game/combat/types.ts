/**
 * Combat data model. All distances are in ring units (1 unit ~ 1 metre) and all
 * times are in milliseconds. Nothing here imports a renderer.
 */

/**
 * Where a move came from. Every move, taunt and prop carries one, so a real
 * performer's actual spots are never confused with something the game invented
 * (Bible s5, and the v2.0 gameplay direction).
 */
export type Provenance = 'REAL_VERIFIED' | 'GAME_ADAPTATION' | 'GAME_ORIGINAL';

export type MoveKind =
  | 'light' | 'heavy' | 'grapple' | 'throw' | 'ground'
  | 'running' | 'rebound' | 'aerial' | 'dive' | 'corner' | 'prop'
  | 'signature' | 'finisher';

/** Where the fighter is standing. Drives which move a button produces. */
export type Zone = 'MAT' | 'ROPES' | 'CORNER' | 'PERCH' | 'APRON' | 'OUTSIDE';

export interface MoveDef {
  id: string;
  name: string;
  kind: MoveKind;
  clip: string;
  provenance: Provenance;
  startupMs: number;
  activeMs: number;
  recoveryMs: number;
  damage: number;
  /** Forward distance from the attacker's chest at which the move connects. */
  reach: number;
  /** Half-angle of the hit cone, radians. Wide cones forgive phone aiming. */
  arc: number;
  knockback: number;
  hitstunMs: number;
  knockdown?: boolean;
  /** Vertical impulse imparted to the victim. */
  launch?: number;
  /**
   * IT Factor for the ATTACKER. Spectacle pays, damage does not: a jab is worth
   * 2 and a dive to the floor is worth 30.
   */
  itGain: number;
  heat: number;
  /** Self-propulsion during startup. */
  lunge?: number;
  /** Launches the attacker into the air; the move resolves while airborne. */
  leap?: { up: number; forward: number };
  hitStopMs?: number;
  cameraPunch?: number;
  cost?: number;
  /** Runs a scripted camera sequence and cannot be reversed. */
  cinematic?: boolean;
  reversible?: boolean;
  shout?: string;
  /** Missing a committed aerial hurts: extra recovery and a hard landing. */
  whiffPenaltyMs?: number;
}

export type TauntKind = 'short' | 'big' | 'opponent' | 'crowd';

/**
 * Taunts are gameplay, not decoration. A big one pays far more IT Factor than
 * any strike and leaves you standing still while someone runs at you.
 */
export interface TauntDef {
  id: string;
  name: string;
  kind: TauntKind;
  clip: string;
  provenance: Provenance;
  durationMs: number;
  it: number;
  heat: number;
  shout?: string;
}

export type PropKind = 'carryable' | 'swinging' | 'throwable' | 'arena' | 'signature';

export interface PropDef {
  id: string;
  name: string;
  kind: PropKind;
  provenance: Provenance;
  /** Rendering hint. Geometry is built procedurally from this. */
  shape: 'can' | 'phone' | 'sign' | 'pipe';
  color: string;
  color2: string;
  /** Size multiplier. CHOKE HOLE props are oversized on purpose. */
  scale: number;
  swing: MoveDef;
}

export interface FighterStats {
  health: number;
  speed: number;
  power: number;
  reversal: number;
  itGain: number;
  radius: number;
  height: number;
  /** Multiplies air time and distance on leaps. RAID jumps further. */
  air: number;
}

export interface SquelshEffect {
  id: string;
  label: string;
  blurb: string;
  durationMs: number;
  damageMult: number;
  speedMult: number;
  itMult: number;
  damageTakenMult: number;
  tint: string;
}

/**
 * Around twenty meaningful actions per wrestler, selected by CONTEXT rather
 * than by extra buttons: where you are standing and what your opponent is doing
 * decides which one ATTACK and GRAB produce.
 */
export interface MoveSet {
  // standing strikes
  light1: MoveDef;
  light2: MoveDef;
  light3: MoveDef;
  heavy: MoveDef;
  // running and the ropes
  running: MoveDef;
  reboundStrike: MoveDef;
  reboundGrapple: MoveDef;
  suicideDive: MoveDef;
  // corner and top rope
  cornerAttack: MoveDef;
  topRopeDive: MoveDef;
  topRopeDiveOutside: MoveDef;
  // grappling
  grapple: MoveDef;
  throwForward: MoveDef;
  throwBack: MoveDef;
  throwCorner: MoveDef;
  throwOutside: MoveDef;
  irishWhip: MoveDef;
  // ground
  ground: MoveDef;
  pickUp: MoveDef;
  // the big ones
  signature: MoveDef;
  finisher: MoveDef;
}
