import { TUNING } from '@/game/config/tuning';
import type { Zone } from './types';

/**
 * Ring geometry. The ropes, corners, apron and floor are gameplay surfaces, not
 * decoration, so every system asks this module where a body actually is.
 *
 * Coordinates are world XZ. The mat sits at TUNING.ring.matY; the floor is 0.
 */

export const RING = {
  /** Mat half-extent across the lateral axis (inside the ropes). */
  half: TUNING.ring.half,
  /** Mat half-extent along the shallow depth axis. */
  halfZ: TUNING.ring.halfZ,
  /** Within this of an edge counts as "at the ropes". */
  ropeBand: 0.62,
  /**
   * Within this of a corner point counts as "in the corner". Generous on
   * purpose: asking a thumb to land inside a one-unit circle before it can
   * climb turns the best move in the game into a fiddly one.
   */
  cornerR: 1.55,
  /** The apron is the walkable ledge between the ropes and the drop. */
  apronOuter: TUNING.ring.half + 0.62,
  apronOuterZ: TUNING.ring.halfZ + 0.62,
  /**
   * Ringside floor extent. Beyond this you are against the barricade.
   *
   * Deliberately narrow: the crowd stands right up against the apron, its first
   * row at half + 1.45. A wider floor let a thrown fighter land BEHIND the front
   * row, where you could not see them, and dragged the camera back so far that
   * the near crowd filled the foreground.
   */
  floorHalf: TUNING.ring.half + 1.15,
  floorHalfZ: TUNING.ring.halfZ + 1.0,
};

export interface Corner { x: number; z: number }

export const CORNERS: Corner[] = [
  { x: RING.half, z: RING.halfZ },
  { x: RING.half, z: -RING.halfZ },
  { x: -RING.half, z: RING.halfZ },
  { x: -RING.half, z: -RING.halfZ },
];

/** Squared distance, for comparisons that never need the square root. */
function d2(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

export function nearestCorner(x: number, z: number): { corner: Corner; dist: number } {
  let best = CORNERS[0]!;
  let bestD = Infinity;
  for (const c of CORNERS) {
    const d = d2(x, z, c.x, c.z);
    if (d < bestD) { bestD = d; best = c; }
  }
  return { corner: best, dist: Math.sqrt(bestD) };
}

export function inCorner(x: number, z: number): boolean {
  return nearestCorner(x, z).dist <= RING.cornerR;
}

/** Inside the ropes, but close enough to an edge to use them. */
export function atRopes(x: number, z: number): boolean {
  return Math.abs(x) >= RING.half - RING.ropeBand
    || Math.abs(z) >= RING.halfZ - RING.ropeBand;
}

export function insideRing(x: number, z: number): boolean {
  return Math.abs(x) <= RING.half && Math.abs(z) <= RING.halfZ;
}

export function onApron(x: number, z: number): boolean {
  if (insideRing(x, z)) return false;
  return Math.abs(x) <= RING.apronOuter && Math.abs(z) <= RING.apronOuterZ;
}

/** The surface height a body at this position falls to. */
export function groundAt(x: number, z: number): number {
  return Math.abs(x) <= RING.apronOuter && Math.abs(z) <= RING.apronOuterZ
    ? TUNING.ring.matY
    : 0;
}

export function zoneAt(x: number, z: number): Zone {
  if (!insideRing(x, z)) return onApron(x, z) ? 'APRON' : 'OUTSIDE';
  if (inCorner(x, z)) return 'CORNER';
  if (atRopes(x, z)) return 'ROPES';
  return 'MAT';
}

export interface RopeHit {
  /** Outward normal of the rope being run at. */
  nx: number;
  nz: number;
  /** Where the body would meet the ropes. */
  cx: number;
  cz: number;
}

/**
 * Which rope a body is heading into, or null if it is not running at one.
 *
 * A corner is NOT a rope: heading into one has to stay a walk, because a player
 * crossing the ring diagonally to climb a turnbuckle would otherwise rebound off
 * the ropes and never arrive — which made the whole top-rope game unreachable.
 * Glancing approaches are excluded for the same reason.
 */
export function ropeAhead(
  x: number, z: number, dx: number, dz: number, lookahead: number,
): RopeHit | null {
  const fx = x + dx * lookahead;
  const fz = z + dz * lookahead;
  if (Math.abs(fx) < RING.half && Math.abs(fz) < RING.halfZ) return null;

  // Whichever axis breaches first is the rope being hit.
  const ox = Math.abs(fx) - RING.half;
  const oz = Math.abs(fz) - RING.halfZ;
  const hit: RopeHit = ox >= oz
    ? { nx: Math.sign(fx) || 1, nz: 0, cx: Math.sign(fx) * RING.half, cz: fz }
    : { nx: 0, nz: Math.sign(fz) || 1, cx: fx, cz: Math.sign(fz) * RING.halfZ };

  if (inCorner(hit.cx, hit.cz)) return null;
  // Must be heading fairly square at the ropes, not sliding along them.
  const dot = Math.abs(dx * hit.nx + dz * hit.nz);
  if (dot < 0.7) return null;
  return hit;
}

/** Clamps a body to the ringside floor so it cannot wander into the crowd. */
export function clampFloor(x: number, z: number, r: number): { x: number; z: number } {
  const lx = RING.floorHalf - r;
  const lz = RING.floorHalfZ - r;
  return {
    x: Math.max(-lx, Math.min(lx, x)),
    z: Math.max(-lz, Math.min(lz, z)),
  };
}

/** Clamps a body to the mat. */
export function clampMat(x: number, z: number, r: number): { x: number; z: number } {
  const lx = RING.half - r;
  const lz = RING.halfZ - r;
  return {
    x: Math.max(-lx, Math.min(lx, x)),
    z: Math.max(-lz, Math.min(lz, z)),
  };
}

/**
 * True when `me` is behind `target`, measured from the target's own facing.
 * This is what makes turning matter: it is the difference between a tie-up and
 * a rear grapple.
 */
export function isBehind(
  meX: number, meZ: number, targetX: number, targetZ: number, targetFacing: number,
): boolean {
  const toMe = Math.atan2(meZ - targetZ, meX - targetX);
  let d = (toMe - targetFacing) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d) > TUNING.combat.rearAngle;
}
