/**
 * Bone names and body proportions.
 *
 * Lifted out of the 3D renderer when that renderer was deleted. None of this
 * was ever about rendering: it is the shape of a wrestler and the vocabulary
 * every animation clip is written against, and it outlived the engine that
 * happened to be drawing it.
 */
/**
 * Bone names. One humanoid skeleton covers most of the roster (Bible s23);
 * RAID adds extra limbs on top rather than using a different hierarchy, so all
 * the shared animation clips still apply to him.
 */
export const BONES = [
  'root', 'hips', 'spine', 'chest', 'neck', 'head',
  'shoulderL', 'upperArmL', 'forearmL', 'handL',
  'shoulderR', 'upperArmR', 'forearmR', 'handR',
  'thighL', 'shinL', 'footL',
  'thighR', 'shinR', 'footR',
  // extra insect limbs, present only when the spec asks for them
  'midArmL', 'midArmR', 'lowArmL', 'lowArmR',
  'antennaL', 'antennaR',
] as const;

export type BoneName = typeof BONES[number];

export interface Proportions {
  /** Total standing height in ring units, heels included. */
  height: number;
  shoulderW: number;
  hipW: number;
  torsoLen: number;
  legLen: number;
  armLen: number;
  headR: number;
  neckLen: number;
  /** Extra lift under the foot. Jassy's platforms, RAID's sneakers. */
  heel: number;
  /** Forward lean of the whole torso, radians. RAID hunches. */
  hunch: number;
  /** Widens limbs and torso. */
  bulk: number;
}

