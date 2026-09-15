import type { BoneName, Proportions } from '@/anim/bones';
import { BONES } from '@/anim/bones';
import type { Pose } from '@/anim/Pose';

/**
 * The same skeleton, solved in two dimensions.
 *
 * The fight has been on a line since the 2.5D rework, and the clip library
 * reflects that: almost every rotation in it is about Z, which in the play
 * plane is simply "swing forward". So the whole animation library carries over
 * unchanged — this just solves it with 2x3 matrices instead of a 3D scene
 * graph, and treats the X component of a pose (a limb splaying toward or away
 * from the camera) as depth rather than as rotation.
 *
 * World space here is the game's own: +X along the play line, +Y up, one unit
 * a little under half a wrestler's height. Screen conversion happens once, at
 * draw time.
 */
export interface Bone2D {
  name: BoneName;
  parent: BoneName | null;
  /** Offset from the parent joint, in the play plane. */
  ox: number;
  oy: number;
  /**
   * Distance off the play line, shoulder-to-shoulder. Nothing rotates by it;
   * it decides which of a pair of limbs is nearer the camera, and therefore
   * which one is drawn over the torso and which behind it.
   */
  depth: number;
}

export interface Solved {
  /** Joint position in world units. */
  x: number;
  y: number;
  /** Accumulated rotation, radians, 0 = hanging straight down. */
  a: number;
  depth: number;
}

export type Solution = Record<BoneName, Solved>;

export function buildSkeleton2D(p: Proportions): Bone2D[] {
  const b: Bone2D[] = [];
  const add = (
    name: BoneName, parent: BoneName | null, ox: number, oy: number, depth = 0,
  ): void => { b.push({ name, parent, ox, oy, depth }); };

  add('root', null, 0, 0);
  add('hips', 'root', 0, p.heel + p.legLen);
  add('spine', 'hips', 0, p.torsoLen * 0.34);
  add('chest', 'spine', 0, p.torsoLen * 0.46);
  add('neck', 'chest', 0, p.torsoLen * 0.2);
  add('head', 'neck', 0, p.neckLen);

  const armY = p.torsoLen * 0.16;
  for (const [s, side] of [['L', 1], ['R', -1]] as const) {
    add(`shoulder${s}` as BoneName, 'chest', 0, armY, side * p.shoulderW * 0.5);
    add(`upperArm${s}` as BoneName, `shoulder${s}` as BoneName, 0, 0, side * p.shoulderW * 0.14);
    add(`forearm${s}` as BoneName, `upperArm${s}` as BoneName, 0, -p.armLen * 0.48);
    add(`hand${s}` as BoneName, `forearm${s}` as BoneName, 0, -p.armLen * 0.44);
    add(`thigh${s}` as BoneName, 'hips', 0, 0, side * p.hipW * 0.34);
    add(`shin${s}` as BoneName, `thigh${s}` as BoneName, 0, -p.legLen * 0.48);
    add(`foot${s}` as BoneName, `shin${s}` as BoneName, 0, -p.legLen * 0.46);
  }

  // Extra limbs, always present so every clip can address them.
  add('midArmL', 'chest', 0.04, -p.torsoLen * 0.06, p.shoulderW * 0.42);
  add('midArmR', 'chest', 0.04, -p.torsoLen * 0.06, -p.shoulderW * 0.42);
  add('lowArmL', 'spine', 0.02, -p.torsoLen * 0.1, p.shoulderW * 0.36);
  add('lowArmR', 'spine', 0.02, -p.torsoLen * 0.1, -p.shoulderW * 0.36);
  add('antennaL', 'head', 0, p.headR * 0.7, p.headR * 0.36);
  add('antennaR', 'head', 0, p.headR * 0.7, -p.headR * 0.36);
  return b;
}

const ZERO: readonly [number, number, number] = [0, 0, 0];

/**
 * Walks the skeleton once, writing a joint position and a world angle per bone.
 *
 * `bias` is the character's neutral hunch, added to every pose so clips do not
 * have to carry it. `lean` is the whole-body tilt a pose asks for.
 */
export function solve2D(
  bones: Bone2D[], pose: Pose, bias: Pose, out: Solution,
): Solution {
  const rootA = pose.rootRz ?? 0;
  for (const b of bones) {
    const p = (pose[b.name] as readonly [number, number, number] | undefined) ?? ZERO;
    const q = (bias[b.name] as readonly [number, number, number] | undefined) ?? ZERO;
    const local = p[2] + q[2];

    if (!b.parent) {
      out[b.name] = {
        x: pose.rootX ?? 0, y: pose.rootY ?? 0, a: rootA + local, depth: b.depth,
      };
      continue;
    }
    const par = out[b.parent]!;
    /*
     * The offset is expressed along the parent's own axes, and a bone's local
     * frame has -Y running down its length, so the parent's angle rotates the
     * offset the same way it rotates the bone.
     */
    const ca = Math.cos(par.a);
    const sa = Math.sin(par.a);
    out[b.name] = {
      x: par.x + b.ox * ca - b.oy * sa,
      y: par.y + b.ox * sa + b.oy * ca,
      a: par.a + local,
      depth: par.depth + b.depth,
    };
  }
  return out;
}

export function emptySolution(): Solution {
  const s = {} as Solution;
  for (const b of BONES) s[b] = { x: 0, y: 0, a: 0, depth: 0 };
  return s;
}

/** The far end of a bone of the given length, following its own -Y axis. */
export function tip(j: Solved, len: number): { x: number; y: number } {
  return { x: j.x + Math.sin(j.a) * len, y: j.y - Math.cos(j.a) * len };
}

