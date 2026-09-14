import type { BoneName, Bones } from './Skeleton';

/** Euler XYZ in radians per bone, plus whole-body offsets. */
export type Pose = Partial<Record<BoneName, readonly [number, number, number]>> & {
  /** Vertical offset of the whole body, ring units. */
  rootY?: number;
  /** Forward offset. */
  rootX?: number;
  /** Sideways offset. */
  rootZ?: number;
  /** Whole-body lean, radians about Z. */
  rootRz?: number;
  /** Whole-body roll, radians about X. */
  rootRx?: number;
};

export interface Keyframe { t: number; pose: Pose }

export interface Clip {
  name: string;
  /** Total length in ms. */
  duration: number;
  loop: boolean;
  keys: Keyframe[];
}

const ZERO: readonly [number, number, number] = [0, 0, 0];

export function makeClip(name: string, duration: number, loop: boolean, keys: Keyframe[]): Clip {
  return { name, duration, loop, keys: keys.slice().sort((a, b) => a.t - b.t) };
}

/** Samples a clip at `ms`, writing into `out`. */
export function sampleClip(clip: Clip, ms: number, out: Pose): Pose {
  const d = clip.duration;
  let t = d > 0 ? ms / d : 0;
  t = clip.loop ? t - Math.floor(t) : Math.min(1, Math.max(0, t));

  const keys = clip.keys;
  if (keys.length === 0) return out;
  if (keys.length === 1) return Object.assign(out, keys[0]!.pose);

  let i = 0;
  while (i < keys.length - 1 && keys[i + 1]!.t <= t) i++;
  const a = keys[i]!;
  const b = keys[Math.min(i + 1, keys.length - 1)]!;
  const span = b.t - a.t;
  const f = span > 1e-6 ? (t - a.t) / span : 0;
  // ease so keyframed poses do not read as linear robot motion
  const e = f * f * (3 - 2 * f);
  return blendPose(a.pose, b.pose, e, out);
}

export function blendPose(a: Pose, b: Pose, t: number, out: Pose): Pose {
  for (const k of Object.keys(out) as (keyof Pose)[]) delete out[k];
  const names = new Set<string>([...Object.keys(a), ...Object.keys(b)]);
  for (const key of names) {
    if (key.startsWith('root')) {
      const av = (a[key as 'rootY'] as number | undefined) ?? 0;
      const bv = (b[key as 'rootY'] as number | undefined) ?? 0;
      (out as Record<string, number>)[key] = av + (bv - av) * t;
    } else {
      const av = (a[key as BoneName] as readonly [number, number, number] | undefined) ?? ZERO;
      const bv = (b[key as BoneName] as readonly [number, number, number] | undefined) ?? ZERO;
      (out as Record<string, [number, number, number]>)[key] = [
        av[0] + (bv[0] - av[0]) * t,
        av[1] + (bv[1] - av[1]) * t,
        av[2] + (bv[2] - av[2]) * t,
      ];
    }
  }
  return out;
}

/** Writes a pose onto the skeleton, adding a per-character bias. */
export function applyPose(bones: Bones, pose: Pose, bias: Pose, root: { y: number }): void {
  const names = new Set<string>([...Object.keys(pose), ...Object.keys(bias)]);
  for (const key of names) {
    if (key.startsWith('root')) continue;
    const name = key as BoneName;
    const p = (pose[name] as readonly [number, number, number] | undefined) ?? ZERO;
    const q = (bias[name] as readonly [number, number, number] | undefined) ?? ZERO;
    const bone = bones[name];
    if (!bone) continue;
    bone.rotation.set(p[0] + q[0], p[1] + q[1], p[2] + q[2]);
  }
  const r = bones.root;
  r.position.set(pose.rootX ?? 0, root.y + (pose.rootY ?? 0), pose.rootZ ?? 0);
  r.rotation.set(pose.rootRx ?? 0, 0, pose.rootRz ?? 0);
}

/** Resets every bone this pose touches, so a stale clip cannot leak through. */
export function clearPose(out: Pose): Pose {
  for (const k of Object.keys(out) as (keyof Pose)[]) delete out[k];
  return out;
}
