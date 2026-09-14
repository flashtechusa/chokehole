import { TUNING } from '@/game/config/tuning';
import type { Zone } from './types';

/**
 * Ring geometry, on ONE AXIS.
 *
 * CHOKE HOLE is 2.5D: 3D models and a 3D arena, but the fight happens on a
 * single line. Everything a wrestler can stand on — the mat, the two corners,
 * the aprons, the ringside floor — is a segment of that line, measured in X.
 * There is no depth in the simulation at all.
 *
 *     floor    apron  [=========== MAT ===========]  apron    floor
 *   -floorHalf      -half                        +half      +floorHalf
 *                    ^corner                    corner^
 *
 * The ring still has four posts and four sides on screen. You can only use two
 * of them, and that is the point: a player pushing left or right always knows
 * exactly what is at the end of the push.
 *
 * Z exists only for rendering. Nothing in this module reads it, and the
 * simulation pins every body to `playZ`.
 */

export const RING = {
  /** Mat half-extent. The whole play line is [-half, +half]. */
  half: TUNING.ring.half,
  /** The single gameplay plane. Every body sits here. */
  playZ: 0,
  /** Within this of an end counts as "at the ropes". */
  ropeBand: 0.62,
  /**
   * Within this of an end counts as "in the corner". Generous on purpose:
   * asking a thumb to stop inside a narrow band before it can climb turns the
   * best move in the game into a fiddly one.
   */
  cornerBand: 1.05,
  /** The apron is the walkable ledge between the ropes and the drop. */
  apronOuter: TUNING.ring.half + 0.62,
  /**
   * Ringside floor extent. Beyond this you are against the barricade.
   *
   * Deliberately narrow: the crowd stands right up against the apron, its first
   * row at half + 1.45. A wider floor let a thrown fighter land BEHIND the front
   * row, where you could not see them.
   */
  floorHalf: TUNING.ring.half + 1.15,

  /* --- rendering only: the ring is a box on screen, a line in play --- */
  halfZ: TUNING.ring.halfZ,
  apronOuterZ: TUNING.ring.halfZ + 0.62,
  floorHalfZ: TUNING.ring.halfZ + 1.0,
};

/** -1 for the left end of the line, +1 for the right. */
export type Side = -1 | 1;

export function sideOf(x: number): Side {
  return x >= 0 ? 1 : -1;
}

/** X of the corner at this end of the ring. */
export function cornerX(x: number): number {
  return sideOf(x) * RING.half;
}

/** How far this body is from the nearer corner. */
export function cornerDist(x: number): number {
  return Math.abs(RING.half - Math.abs(x));
}

export function inCorner(x: number): boolean {
  return Math.abs(x) >= RING.half - RING.cornerBand;
}

/** Inside the ropes, but close enough to an end to use them. */
export function atRopes(x: number): boolean {
  return Math.abs(x) >= RING.half - RING.ropeBand;
}

export function insideRing(x: number): boolean {
  return Math.abs(x) <= RING.half;
}

export function onApron(x: number): boolean {
  if (insideRing(x)) return false;
  return Math.abs(x) <= RING.apronOuter;
}

/** The surface height a body at this position falls to. */
export function groundAt(x: number): number {
  return Math.abs(x) <= RING.apronOuter ? TUNING.ring.matY : 0;
}

export function zoneAt(x: number): Zone {
  if (!insideRing(x)) return onApron(x) ? 'APRON' : 'OUTSIDE';
  if (inCorner(x)) return 'CORNER';
  if (atRopes(x)) return 'ROPES';
  return 'MAT';
}

/**
 * The rope a body is heading into, as an outward direction, or 0 if it is not
 * running at one.
 *
 * On a line the two ends are BOTH the ropes and the corners, and that is fine,
 * because the player says which one they mean with a different input: a sprint
 * into the end runs the ropes, a GRAB at the end climbs the turnbuckle. In two
 * dimensions this function had to refuse corners, or a player crossing the ring
 * diagonally to climb would rebound instead of arriving. Keeping that refusal
 * here made rope running impossible: every position close enough to trip the
 * lookahead is also inside the corner band.
 */
export function ropeAhead(x: number, dir: number, lookahead: number): Side | 0 {
  if (dir === 0) return 0;
  const ahead = x + Math.sign(dir) * lookahead;
  if (Math.abs(ahead) < RING.half) return 0;
  const side = sideOf(ahead);
  // Running at the ropes means running at the END you are pointed at.
  return Math.sign(dir) === side ? side : 0;
}

/** Clamps a body to the ringside floor so it cannot wander into the crowd. */
export function clampFloor(x: number, r: number): number {
  const lim = RING.floorHalf - r;
  return Math.max(-lim, Math.min(lim, x));
}

/** Clamps a body to the mat. */
export function clampMat(x: number, r: number): number {
  const lim = RING.half - r;
  return Math.max(-lim, Math.min(lim, x));
}

/**
 * True when `me` is behind `target`. On a line this is exact: you are behind
 * someone when you are on the side they are not facing. This is what makes
 * turning matter — it is the difference between a tie-up and a rear grapple.
 */
export function isBehind(meX: number, targetX: number, targetDir: number): boolean {
  const gap = meX - targetX;
  if (Math.abs(gap) < 0.05) return false;
  return Math.sign(gap) !== Math.sign(targetDir);
}
