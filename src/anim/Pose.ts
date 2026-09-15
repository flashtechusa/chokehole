import type { BoneName } from '@/anim/bones';

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

/**
 * How a keyframe travels to the NEXT one.
 *
 * Every span used to get the same smoothstep, which is why a punch read as
 * polite: the windup and the contact had identical acceleration, so the fist
 * arrived at the same speed it left. Real movement is asymmetric — you drift
 * into a windup and explode out of it, and you land hard and settle soft.
 *
 *   smooth  ease in and out, the old default; good for locomotion
 *   in      accelerate; slow out of this key, fast into the next
 *   snap    accelerate hard; the windup-to-contact curve
 *   out     decelerate; lands and settles, the recovery curve
 *   linear  constant; for a dwell between two identical poses
 *   hold    stay put, then cut; for a frame that must not smear
 */
export type Ease = 'smooth' | 'in' | 'snap' | 'out' | 'linear' | 'hold';

export interface Keyframe { t: number; pose: Pose; ease?: Ease }

function applyEase(f: number, e: Ease | undefined): number {
  switch (e) {
    case 'in': return f * f;
    case 'snap': return f * f * f;
    case 'out': return 1 - (1 - f) * (1 - f);
    case 'linear': return f;
    case 'hold': return f >= 1 ? 1 : 0;
    default: return f * f * (3 - 2 * f);
  }
}

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
  // The curve belongs to the key it leaves, not to the clip.
  return blendPose(a.pose, b.pose, applyEase(f, a.ease), out);
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

export function clearPose(out: Pose): Pose {
  for (const k of Object.keys(out) as (keyof Pose)[]) delete out[k];
  return out;
}
