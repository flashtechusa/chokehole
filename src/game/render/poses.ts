/**
 * Procedural pose library for the placeholder rig.
 *
 * These are ORIGINAL stick-and-shape poses generated at runtime. No performer
 * photography is used anywhere in the pipeline. When approved sprite atlases
 * arrive they replace this layer wholesale (see docs/CHARACTER_ASSETS.md).
 *
 * Local space: origin at the feet, +y is UP, +x is the direction the fighter
 * faces. Limb angles are degrees where 0 = hanging straight down and positive
 * swings forward.
 */
export interface Pose {
  /** Whole-body offset. */
  ox: number;
  oy: number;
  /** Body rotation about the feet (used for slams and lying states). */
  tilt: number;
  /** Hip height multiplier (crouch). */
  crouch: number;
  /** Torso lean, degrees. */
  spine: number;
  head: number;
  /** [shoulder, elbow] */
  armF: [number, number];
  armB: [number, number];
  legF: [number, number];
  legB: [number, number];
  /** Prop rotation offset, degrees. */
  prop: number;
  /** Lying flat on the mat. */
  lying?: boolean;
}

export interface Keyframe { t: number; pose: Pose }
export interface Clip { frames: Keyframe[]; loop: boolean; /** seconds for looping clips */ dur?: number }

const base: Pose = {
  ox: 0, oy: 0, tilt: 0, crouch: 1, spine: 4, head: 0,
  armF: [14, -26], armB: [-10, -22], legF: [4, 6], legB: [-6, 8], prop: 0,
};

export const P = (p: Partial<Pose>): Pose => ({ ...base, ...p });

const C = (frames: Keyframe[], loop = false, dur?: number): Clip => ({ frames, loop, dur });

export const CLIPS: Record<string, Clip> = {
  idle: C([
    { t: 0, pose: P({ oy: 0, armF: [12, -24], armB: [-9, -20], spine: 4 }) },
    { t: 0.5, pose: P({ oy: 2.5, armF: [17, -30], armB: [-13, -26], spine: 6, crouch: 0.985 }) },
    { t: 1, pose: P({ oy: 0, armF: [12, -24], armB: [-9, -20], spine: 4 }) },
  ], true, 1.5),

  walk: C([
    { t: 0, pose: P({ legF: [26, 4], legB: [-24, 22], armF: [-22, -18], armB: [24, -20], spine: 7 }) },
    { t: 0.25, pose: P({ oy: 3, legF: [4, 10], legB: [-4, 14], armF: [0, -22], armB: [2, -22], spine: 8, crouch: 0.98 }) },
    { t: 0.5, pose: P({ legF: [-24, 22], legB: [26, 4], armF: [24, -20], armB: [-22, -18], spine: 7 }) },
    { t: 0.75, pose: P({ oy: 3, legF: [-4, 14], legB: [4, 10], armF: [2, -22], armB: [0, -22], spine: 8, crouch: 0.98 }) },
    { t: 1, pose: P({ legF: [26, 4], legB: [-24, 22], armF: [-22, -18], armB: [24, -20], spine: 7 }) },
  ], true, 0.62),

  run: C([
    { t: 0, pose: P({ oy: 4, spine: 18, legF: [44, 8], legB: [-38, 58], armF: [-46, -52], armB: [52, -48], head: -6, crouch: 0.95 }) },
    { t: 0.25, pose: P({ oy: 10, spine: 20, legF: [10, 46], legB: [-6, 30], armF: [-6, -46], armB: [10, -44], head: -6, crouch: 0.93 }) },
    { t: 0.5, pose: P({ oy: 4, spine: 18, legF: [-38, 58], legB: [44, 8], armF: [52, -48], armB: [-46, -52], head: -6, crouch: 0.95 }) },
    { t: 0.75, pose: P({ oy: 10, spine: 20, legF: [-6, 30], legB: [10, 46], armF: [10, -44], armB: [-6, -46], head: -6, crouch: 0.93 }) },
    { t: 1, pose: P({ oy: 4, spine: 18, legF: [44, 8], legB: [-38, 58], armF: [-46, -52], armB: [52, -48], head: -6, crouch: 0.95 }) },
  ], true, 0.42),

  block: C([
    { t: 0, pose: P({ crouch: 0.9, spine: -6, armF: [128, -96], armB: [118, -88], legF: [16, 22], legB: [-18, 26], head: 6 }) },
    { t: 1, pose: P({ crouch: 0.89, spine: -7, armF: [132, -98], armB: [122, -90], legF: [16, 22], legB: [-18, 26], head: 6 }) },
  ], true, 0.4),

  reversal: C([
    { t: 0, pose: P({ crouch: 0.86, spine: -16, armF: [156, -40], armB: [140, -30], legF: [24, 20], legB: [-22, 30] }) },
    { t: 0.4, pose: P({ crouch: 1.02, spine: 22, armF: [70, -6], armB: [40, -20], legF: [-10, 16], legB: [18, 12] }) },
    { t: 1, pose: P({ spine: 8, armF: [24, -28], armB: [-6, -24] }) },
  ]),

  light1: C([
    { t: 0, pose: P({ spine: -10, armF: [-52, -72], armB: [16, -30], legF: [-6, 12], legB: [10, 10], crouch: 0.97 }) },
    { t: 0.45, pose: P({ spine: 24, armF: [96, -6], armB: [-30, -28], legF: [16, 6], legB: [-12, 16], ox: 6 }) },
    { t: 0.7, pose: P({ spine: 20, armF: [88, -12], armB: [-26, -26], ox: 4 }) },
    { t: 1, pose: P({ spine: 6, armF: [20, -26], armB: [-8, -22] }) },
  ]),

  light2: C([
    { t: 0, pose: P({ spine: 18, armF: [102, -30], armB: [-24, -30], crouch: 0.98 }) },
    { t: 0.45, pose: P({ spine: -14, armF: [-58, -18], armB: [40, -26], ox: 5, head: -8 }) },
    { t: 0.7, pose: P({ spine: -8, armF: [-40, -24], armB: [30, -24], ox: 3 }) },
    { t: 1, pose: P({ spine: 5, armF: [16, -26], armB: [-8, -22] }) },
  ]),

  heavy: C([
    { t: 0, pose: P({ spine: -26, crouch: 0.9, armF: [-92, -104], armB: [-58, -74], legF: [-14, 22], legB: [20, 14], head: -12 }) },
    { t: 0.42, pose: P({ spine: -30, crouch: 0.88, armF: [-104, -110], armB: [-66, -80], head: -16, ox: -4 }) },
    { t: 0.62, pose: P({ spine: 34, crouch: 1.02, armF: [118, -4], armB: [-46, -34], legF: [26, 4], legB: [-20, 26], ox: 16, head: 10 }) },
    { t: 0.8, pose: P({ spine: 28, armF: [104, -10], armB: [-38, -30], ox: 12 }) },
    { t: 1, pose: P({ spine: 6, armF: [18, -26], armB: [-8, -22] }) },
  ]),

  grappleStart: C([
    { t: 0, pose: P({ spine: 12, crouch: 0.95, armF: [66, -40], armB: [58, -44], legF: [12, 12], legB: [-14, 18] }) },
    { t: 0.5, pose: P({ spine: 20, crouch: 0.94, armF: [92, -12], armB: [86, -14], ox: 8, legF: [18, 8], legB: [-16, 22] }) },
    { t: 1, pose: P({ spine: 16, armF: [86, -16], armB: [80, -18], ox: 5 }) },
  ]),

  grappleHold: C([
    { t: 0, pose: P({ spine: 14, crouch: 0.93, armF: [88, -18], armB: [82, -20], legF: [14, 14], legB: [-16, 20] }) },
    { t: 0.5, pose: P({ spine: 17, crouch: 0.91, armF: [92, -22], armB: [86, -24], legF: [16, 12], legB: [-18, 22] }) },
    { t: 1, pose: P({ spine: 14, crouch: 0.93, armF: [88, -18], armB: [82, -20], legF: [14, 14], legB: [-16, 20] }) },
  ], true, 0.35),

  grappled: C([
    { t: 0, pose: P({ spine: -20, crouch: 0.96, armF: [-70, -60], armB: [-84, -50], legF: [-16, 26], legB: [14, 30], head: -14 }) },
    { t: 0.5, pose: P({ spine: -26, crouch: 0.94, armF: [-96, -40], armB: [-60, -70], legF: [10, 34], legB: [-18, 24], head: -18 }) },
    { t: 1, pose: P({ spine: -20, crouch: 0.96, armF: [-70, -60], armB: [-84, -50], legF: [-16, 26], legB: [14, 30], head: -14 }) },
  ], true, 0.28),

  grappleThrow: C([
    { t: 0, pose: P({ spine: 22, crouch: 0.9, armF: [96, -20], armB: [90, -22] }) },
    { t: 0.35, pose: P({ spine: -40, crouch: 0.82, armF: [-30, -120], armB: [-38, -116], head: -20, oy: 6 }) },
    { t: 0.6, pose: P({ spine: 46, crouch: 1.04, armF: [150, -8], armB: [140, -10], ox: 12, head: 14 }) },
    { t: 1, pose: P({ spine: 8, armF: [26, -26], armB: [-6, -22] }) },
  ]),

  signature: C([
    { t: 0, pose: P({ spine: -18, crouch: 0.92, armF: [-30, -110], armB: [-24, -104], head: -10, prop: -30 }) },
    { t: 0.35, pose: P({ spine: -24, crouch: 0.86, armF: [-70, -126], armB: [-60, -120], head: -18, oy: 4, prop: -60 }) },
    { t: 0.6, pose: P({ spine: 30, crouch: 1.06, armF: [126, -6], armB: [104, -18], ox: 18, head: 12, prop: 40 }) },
    { t: 0.85, pose: P({ spine: 22, armF: [110, -12], armB: [92, -22], ox: 12, prop: 24 }) },
    { t: 1, pose: P({ spine: 6, armF: [18, -26], armB: [-8, -22] }) },
  ]),

  finisher: C([
    { t: 0, pose: P({ spine: -14, crouch: 0.9, armF: [-40, -120], armB: [-34, -112], head: -12, prop: -40 }) },
    { t: 0.3, pose: P({ spine: -34, crouch: 0.8, armF: [-96, -140], armB: [-88, -134], head: -26, oy: 10, prop: -90 }) },
    { t: 0.52, pose: P({ spine: 44, crouch: 1.1, armF: [148, 0], armB: [128, -10], ox: 26, head: 18, prop: 70, oy: 4 }) },
    { t: 0.78, pose: P({ spine: 30, crouch: 0.96, armF: [124, -8], armB: [108, -18], ox: 16, prop: 40 }) },
    { t: 1, pose: P({ spine: 8, armF: [20, -26], armB: [-8, -22] }) },
  ]),

  hurt: C([
    { t: 0, pose: P({ spine: -30, head: -24, armF: [-46, -46], armB: [-40, -40], crouch: 0.95, ox: -6 }) },
    { t: 0.5, pose: P({ spine: -18, head: -14, armF: [-28, -40], armB: [-24, -36], ox: -3 }) },
    { t: 1, pose: P({ spine: 4, head: -2, armF: [10, -26], armB: [-8, -22] }) },
  ]),

  down: C([
    { t: 0, pose: P({ lying: true, tilt: -84, oy: 0, armF: [-60, -30], armB: [50, -20], legF: [-20, 18], legB: [16, 22], head: -20 }) },
    { t: 1, pose: P({ lying: true, tilt: -88, oy: 0, armF: [-52, -26], armB: [44, -18], legF: [-14, 14], legB: [12, 20], head: -22 }) },
  ], true, 0.9),

  pinned: C([
    { t: 0, pose: P({ lying: true, tilt: -90, armF: [-70, -40], armB: [60, -30], legF: [-24, 20], legB: [20, 24], head: -24 }) },
    { t: 0.5, pose: P({ lying: true, tilt: -86, armF: [-58, -50], armB: [72, -22], legF: [-16, 28], legB: [26, 18], head: -18 }) },
    { t: 1, pose: P({ lying: true, tilt: -90, armF: [-70, -40], armB: [60, -30], legF: [-24, 20], legB: [20, 24], head: -24 }) },
  ], true, 0.34),

  getUp: C([
    { t: 0, pose: P({ lying: true, tilt: -70, crouch: 0.9, armF: [-40, -60], armB: [40, -40], head: -18 }) },
    { t: 0.55, pose: P({ tilt: -26, crouch: 0.6, spine: 34, armF: [60, -70], armB: [-30, -60], legF: [30, 60], legB: [-16, 50], head: -8 }) },
    { t: 1, pose: P({ spine: 6, armF: [14, -26], armB: [-10, -22] }) },
  ]),

  taunt: C([
    { t: 0, pose: P({ spine: -8, armF: [-140, -20], armB: [-132, -24], head: -18, crouch: 1.02 }) },
    { t: 0.5, pose: P({ spine: -14, armF: [-165, -6], armB: [-158, -8], head: -26, crouch: 1.05, oy: 6 }) },
    { t: 1, pose: P({ spine: -8, armF: [-140, -20], armB: [-132, -24], head: -18, crouch: 1.02 }) },
  ], true, 0.75),

  pin: C([
    { t: 0, pose: P({ crouch: 0.42, spine: 58, armF: [124, -10], armB: [116, -14], legF: [64, 92], legB: [-30, 96], head: 22, oy: -2 }) },
    { t: 0.5, pose: P({ crouch: 0.4, spine: 62, armF: [130, -6], armB: [122, -10], legF: [66, 94], legB: [-28, 98], head: 26 }) },
    { t: 1, pose: P({ crouch: 0.42, spine: 58, armF: [124, -10], armB: [116, -14], legF: [64, 92], legB: [-30, 96], head: 22 }) },
  ], true, 0.5),

  victory: C([
    { t: 0, pose: P({ armF: [-150, -20], armB: [-142, -26], head: -20, spine: -8 }) },
    { t: 0.5, pose: P({ armF: [-168, -8], armB: [-160, -12], head: -28, spine: -12, oy: 8, crouch: 1.03 }) },
    { t: 1, pose: P({ armF: [-150, -20], armB: [-142, -26], head: -20, spine: -8 }) },
  ], true, 0.8),

  loss: C([
    { t: 0, pose: P({ crouch: 0.52, spine: 42, head: 30, armF: [30, -10], armB: [22, -8], legF: [40, 96], legB: [-24, 92] }) },
    { t: 1, pose: P({ crouch: 0.5, spine: 46, head: 34, armF: [26, -8], armB: [18, -6], legF: [42, 98], legB: [-22, 94] }) },
  ], true, 1.4),
};

const lerpPose = (a: Pose, b: Pose, t: number): Pose => ({
  ox: a.ox + (b.ox - a.ox) * t,
  oy: a.oy + (b.oy - a.oy) * t,
  tilt: a.tilt + (b.tilt - a.tilt) * t,
  crouch: a.crouch + (b.crouch - a.crouch) * t,
  spine: a.spine + (b.spine - a.spine) * t,
  head: a.head + (b.head - a.head) * t,
  armF: [a.armF[0] + (b.armF[0] - a.armF[0]) * t, a.armF[1] + (b.armF[1] - a.armF[1]) * t],
  armB: [a.armB[0] + (b.armB[0] - a.armB[0]) * t, a.armB[1] + (b.armB[1] - a.armB[1]) * t],
  legF: [a.legF[0] + (b.legF[0] - a.legF[0]) * t, a.legF[1] + (b.legF[1] - a.legF[1]) * t],
  legB: [a.legB[0] + (b.legB[0] - a.legB[0]) * t, a.legB[1] + (b.legB[1] - a.legB[1]) * t],
  prop: a.prop + (b.prop - a.prop) * t,
  lying: t < 0.5 ? a.lying : b.lying,
});

/** Samples a clip at normalised time. */
export function samplePose(clipName: string, t: number): Pose {
  const clip = CLIPS[clipName] ?? CLIPS.idle!;
  const frames = clip.frames;
  const u = clip.loop ? ((t % 1) + 1) % 1 : Math.max(0, Math.min(1, t));
  for (let i = 0; i < frames.length - 1; i++) {
    const f0 = frames[i]!;
    const f1 = frames[i + 1]!;
    if (u >= f0.t && u <= f1.t) {
      const span = f1.t - f0.t || 1;
      const k = (u - f0.t) / span;
      // smoothstep for weight, so poses settle instead of sliding linearly
      const s = k * k * (3 - 2 * k);
      return lerpPose(f0.pose, f1.pose, s);
    }
  }
  return frames[frames.length - 1]!.pose;
}

export function clipDuration(clipName: string): number {
  return CLIPS[clipName]?.dur ?? 1;
}
