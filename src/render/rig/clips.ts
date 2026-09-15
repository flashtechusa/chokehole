import { makeClip, type Clip, type Pose } from './Pose';

/**
 * The shared animation library (Bible s23 minimum set).
 *
 * Axis convention, derived from the skeleton: for any limb hanging down -Y,
 * +Z rotation swings it FORWARD, -X rotation swings the left side OUTWARD, and
 * +X swings the right side outward. Torso +Z bends forward. Head +Z is chin-down.
 *
 * `Style` lets one library produce two genuinely different fighters: Jassy is
 * poised, narrow and precise; RAID is hunched, wide and jittery. They are not
 * the same animation with a different skin.
 */
export interface Style {
  /** Multiplies every limb swing. RAID swings wider. */
  amp: number;
  /** Constant forward lean added to the spine. */
  lean: number;
  /** Stance width; scales the outward rotation of the thighs. */
  stance: number;
  /** Idle bob speed multiplier. */
  bounce: number;
  /** Extra elbow flex, so RAID's arms sit cocked and insectile. */
  elbow: number;
  /** How much the hips sway. Jassy's is the whole point of her walk. */
  sway: number;
}

export const STYLE_POISED: Style = { amp: 1, lean: 0.05, stance: 1, bounce: 1, elbow: 0, sway: 1.35 };
export const STYLE_BRUTE: Style = { amp: 1.25, lean: 0.2, stance: 1.5, bounce: 0.85, elbow: 0.4, sway: 0.5 };

/**
 * Which way a +Z rotation swings a foot. The foot bone's geometry runs +X from
 * the ankle rather than -Y like every other limb, so its sign is not the one
 * the axis note above gives for arms and legs; this is the single place that
 * knows it.
 */
const ANKLE = 1;

type V = readonly [number, number, number];
const v = (x: number, y: number, z: number): V => [x, y, z];

export function buildClips(s: Style): Record<string, Clip> {
  const A = s.amp;
  const E = s.elbow;

  /** The neutral fighting stance every clip departs from. */
  const stance = (): Pose => ({
    rootY: -0.03,
    spine: v(0, 0, s.lean),
    chest: v(0, 0, -0.03),
    head: v(0, 0, -0.04),
    upperArmL: v(-0.26 * A, 0, 0.30 * A),
    forearmL: v(0, 0, (0.62 + E) * A),
    upperArmR: v(0.26 * A, 0, 0.30 * A),
    forearmR: v(0, 0, (0.62 + E) * A),
    thighL: v(-0.09 * s.stance, 0, 0.10),
    shinL: v(0, 0, -0.22),
    footL: v(0, 0, ANKLE * 0.12),
    thighR: v(0.09 * s.stance, 0, 0.10),
    shinR: v(0, 0, -0.22),
    footR: v(0, 0, ANKLE * 0.12),
    midArmL: v(-0.5, 0, 0.5), midArmR: v(0.5, 0, 0.5),
    lowArmL: v(-0.4, 0, 0.3), lowArmR: v(0.4, 0, 0.3),
    antennaL: v(-0.3, 0, -0.4), antennaR: v(0.3, 0, -0.4),
  });

  const mix = (base: Pose, over: Pose): Pose => ({ ...base, ...over });

  /* ---------------- locomotion ---------------- */

  /*
   * Idle is a weight shift, not just a bob. A fighter standing still still
   * moves: the weight goes from one foot to the other and the hands drift with
   * it. The lean is what reads from the side — depth movement in a 2.5D game
   * seen from the ropes is movement the camera cannot see.
   */
  const idleA: Pose = mix(stance(), {
    rootY: -0.03, rootRz: -0.022, chest: v(0, 0, -0.03),
    hips: v(0, -0.05 * s.sway, 0),
    upperArmL: v(-0.26 * A, 0, 0.26 * A),
    upperArmR: v(0.26 * A, 0, 0.34 * A),
  });
  const idleB: Pose = mix(stance(), {
    rootY: 0.008, rootRz: 0.022, chest: v(0, 0.05, 0.01), head: v(0, 0.06, -0.04),
    hips: v(0, 0.05 * s.sway, 0),
    upperArmL: v(-0.26 * A, 0, 0.34 * A),
    upperArmR: v(0.26 * A, 0, 0.26 * A),
  });
  const idle = makeClip('idle', 1500 / s.bounce, true, [
    { t: 0, pose: idleA },
    { t: 0.5, pose: idleB },
    { t: 1, pose: idleA },
  ]);

  const stepPose = (phase: 1 | -1, lift: number, swing: number): Pose => {
    const f = phase;
    const thL = 0.10 + swing * f;
    const shL = -0.22 - Math.max(0, -swing * f) * 1.1;
    const thR = 0.10 - swing * f;
    const shR = -0.22 - Math.max(0, swing * f) * 1.1;
    return mix(stance(), {
      rootY: -0.03 - lift * 0.35,
      rootZ: s.sway * 0.035 * f,
      hips: v(0, 0.06 * f * s.sway, 0),
      spine: v(0, -0.05 * f, s.lean),
      thighL: v(-0.09 * s.stance, 0, thL),
      shinL: v(0, 0, shL),
      // Ankles. Nothing ever posed the feet, so a leg swinging through a stride
      // carried the whole boot round with it at a fixed angle and the sole
      // never met the mat. The foot counters the rest of the leg, so it stays
      // flat when it is planted, and gives up some of that as it lifts and the
      // toe drops behind.
      footL: v(0, 0, ANKLE * (-(thL + shL) * 0.85 - lift * 1.1)),
      thighR: v(0.09 * s.stance, 0, thR),
      shinR: v(0, 0, shR),
      footR: v(0, 0, ANKLE * (-(thR + shR) * 0.85 - lift * 1.1)),
      upperArmL: v(-0.26 * A, 0, 0.30 * A - swing * f * 0.75),
      upperArmR: v(0.26 * A, 0, 0.30 * A + swing * f * 0.75),
      forearmL: v(0, 0, (0.62 + E) * A),
      forearmR: v(0, 0, (0.62 + E) * A),
    });
  };

  const walk = makeClip('walk', 760, true, [
    { t: 0, pose: stepPose(1, 0.05, 0.42) },
    { t: 0.25, pose: stepPose(1, 0.0, 0.0) },
    { t: 0.5, pose: stepPose(-1, 0.05, 0.42) },
    { t: 0.75, pose: stepPose(-1, 0.0, 0.0) },
    { t: 1, pose: stepPose(1, 0.05, 0.42) },
  ]);

  const run = makeClip('run', 480, true, [
    { t: 0, pose: mix(stepPose(1, 0.12, 0.78), { spine: v(0, 0, s.lean + 0.16) }) },
    { t: 0.25, pose: mix(stepPose(1, 0.02, 0.1), { spine: v(0, 0, s.lean + 0.2) }) },
    { t: 0.5, pose: mix(stepPose(-1, 0.12, 0.78), { spine: v(0, 0, s.lean + 0.16) }) },
    { t: 0.75, pose: mix(stepPose(-1, 0.02, 0.1), { spine: v(0, 0, s.lean + 0.2) }) },
    { t: 1, pose: mix(stepPose(1, 0.12, 0.78), { spine: v(0, 0, s.lean + 0.16) }) },
  ]);

  /* ---------------- strikes ---------------- */

  const strike = (name: string, dur: number, arm: 'L' | 'R', big: boolean): Clip => {
    const sgn = arm === 'L' ? -1 : 1;
    const ua = `upperArm${arm}` as const;
    const fa = `forearm${arm}` as const;
    const oua = `upperArm${arm === 'L' ? 'R' : 'L'}` as const;
    const wind: Pose = mix(stance(), {
      rootRz: -0.1 * (big ? 2 : 1),
      hips: v(0, -0.34 * sgn * (big ? 1.4 : 1), 0),
      chest: v(0, -0.46 * sgn * (big ? 1.3 : 1), -0.06),
      [ua]: v(0.5 * sgn, 0, -0.55 * A),
      [fa]: v(0, 0, (1.5 + E) * A),
    } as Pose);
    const hit: Pose = mix(stance(), {
      rootX: big ? 0.1 : 0.05,
      rootRz: 0.14 * (big ? 1.8 : 1),
      hips: v(0, 0.36 * sgn * (big ? 1.4 : 1), 0),
      chest: v(0, 0.5 * sgn * (big ? 1.3 : 1), 0.16),
      [ua]: v(0.12 * sgn, 0, (big ? 1.5 : 1.32) * A),
      [fa]: v(0, 0, (big ? 0.18 : 0.1) + E * 0.5),
      [oua]: v(-0.5 * sgn, 0, -0.3 * A),
      thighL: v(-0.09 * s.stance, 0, 0.22),
      thighR: v(0.09 * s.stance, 0, 0.0),
    } as Pose);
    /*
     * The settle. A body that stops dead where the punch left it is a body made
     * of wood: the weight it threw forward has to come back, so it rocks a
     * little PAST neutral the other way before it finds the stance again.
     */
    const settle: Pose = mix(stance(), {
      rootRz: -0.06,
      chest: v(0, -0.14 * sgn, -0.04),
      [ua]: v(0.08 * sgn, 0, 0.14 * A),
    } as Pose);
    return makeClip(name, dur, false, [
      // Drift back into the windup, slowing as it loads...
      { t: 0, pose: stance(), ease: 'out' },
      // ...then explode out of it. This one curve is most of the difference
      // between a punch and a polite gesture.
      { t: big ? 0.34 : 0.3, pose: wind, ease: 'snap' },
      { t: big ? 0.52 : 0.46, pose: hit, ease: 'linear' },
      { t: 0.72, pose: hit, ease: 'out' },
      { t: 0.88, pose: settle },
      // Ends exactly on the stance, so handing back to idle does not pop.
      { t: 1, pose: stance() },
    ]);
  };

  const lightAttack1 = strike('lightAttack1', 420, 'R', false);
  const lightAttack2 = strike('lightAttack2', 440, 'L', false);
  const lightAttack3 = strike('lightAttack3', 480, 'R', false);
  const heavyAttack = strike('heavyAttack', 700, 'R', true);

  const groundStrike = makeClip('groundStrike', 620, false, [
    { t: 0, pose: stance(), ease: 'out' },
    { t: 0.32, pose: mix(stance(), {
      rootY: -0.06, spine: v(0, 0, s.lean + 0.3),
      upperArmR: v(0.2, 0, -0.8), forearmR: v(0, 0, 1.7),
      thighL: v(-0.1, 0, 0.5), shinL: v(0, 0, -0.9),
    }), ease: 'snap' },
    { t: 0.52, pose: mix(stance(), {
      rootY: -0.3, rootX: 0.16, spine: v(0, 0, s.lean + 0.85),
      upperArmR: v(0.05, 0, 1.9), forearmR: v(0, 0, 0.15),
      thighL: v(-0.1, 0, 1.1), shinL: v(0, 0, -1.5),
      thighR: v(0.1, 0, -0.3),
    }), ease: 'out' },
    { t: 1, pose: stance() },
  ]);

  /* ---------------- reactions ---------------- */

  // A struck body recoils instantly and recovers slowly, never the reverse.
  const hitFront = makeClip('hitFront', 320, false, [
    { t: 0, pose: mix(stance(), {
      rootX: -0.08, rootRz: -0.3,
      spine: v(0, 0, s.lean - 0.34), head: v(0, 0, -0.5),
      upperArmL: v(-0.6, 0, -0.3), upperArmR: v(0.6, 0, -0.3),
    }), ease: 'out' },
    { t: 0.45, pose: mix(stance(), { rootX: -0.04, rootRz: -0.14, spine: v(0, 0, s.lean - 0.15), head: v(0, 0, -0.25) }), ease: 'out' },
    { t: 0.78, pose: mix(stance(), { rootRz: 0.07, head: v(0, 0, 0.1) }) },
    { t: 1, pose: stance() },
  ]);

  const hitBack = makeClip('hitBack', 340, false, [
    { t: 0, pose: mix(stance(), {
      rootX: 0.06, rootRz: 0.34, spine: v(0, 0, s.lean + 0.4), head: v(0, 0, 0.35),
      upperArmL: v(-0.3, 0, 0.9), upperArmR: v(0.3, 0, 0.9),
    }), ease: 'out' },
    { t: 0.76, pose: mix(stance(), { rootRz: -0.08, spine: v(0, 0, s.lean - 0.08) }) },
    { t: 1, pose: stance() },
  ]);

  const reversal = makeClip('reversal', 460, false, [
    { t: 0, pose: mix(stance(), {
      rootRz: -0.22, chest: v(0, -0.7, -0.1),
      upperArmL: v(-0.9, 0, 0.9), forearmL: v(0, 0, 1.5),
      upperArmR: v(0.9, 0, 0.5), forearmR: v(0, 0, 1.3),
    }), ease: 'snap' },
    { t: 0.35, pose: mix(stance(), {
      rootRz: 0.2, rootX: 0.06, chest: v(0, 0.8, 0.1),
      upperArmL: v(-0.3, 0, 1.6), forearmL: v(0, 0, 0.2),
      upperArmR: v(0.3, 0, 1.4), forearmR: v(0, 0, 0.2),
    }), ease: 'out' },
    { t: 0.82, pose: mix(stance(), { rootRz: -0.07, chest: v(0, -0.16, 0) }) },
    { t: 1, pose: stance() },
  ]);

  /* ---------------- grapple ---------------- */

  const reach = (): Pose => mix(stance(), {
    rootX: 0.05,
    upperArmL: v(-0.5, 0, 1.25 * A), forearmL: v(0, 0, 0.3),
    upperArmR: v(0.5, 0, 1.25 * A), forearmR: v(0, 0, 0.3),
    spine: v(0, 0, s.lean + 0.14),
    midArmL: v(-0.9, 0, 1.1), midArmR: v(0.9, 0, 1.1),
  });

  const grappleStart = makeClip('grappleStart', 360, false, [
    { t: 0, pose: stance() },
    { t: 0.5, pose: reach() },
    { t: 1, pose: reach() },
  ]);

  const grappleHold = makeClip('grappleHold', 900, true, [
    { t: 0, pose: mix(reach(), { rootRz: -0.05, hips: v(0, -0.12, 0) }) },
    { t: 0.5, pose: mix(reach(), { rootRz: 0.05, hips: v(0, 0.12, 0) }) },
    { t: 1, pose: mix(reach(), { rootRz: -0.05, hips: v(0, -0.12, 0) }) },
  ]);

  const grappled = makeClip('grappled', 700, true, [
    { t: 0, pose: mix(stance(), {
      rootRz: -0.22, spine: v(0, 0, s.lean - 0.2), head: v(0, 0, -0.35),
      upperArmL: v(-1.0, 0, -0.5), upperArmR: v(1.0, 0, -0.5),
      forearmL: v(0, 0, 1.2), forearmR: v(0, 0, 1.2),
    }) },
    { t: 0.5, pose: mix(stance(), {
      rootRz: 0.16, spine: v(0, 0, s.lean - 0.3), head: v(0, 0, -0.2),
      upperArmL: v(-1.2, 0, -0.2), upperArmR: v(1.2, 0, -0.2),
      forearmL: v(0, 0, 1.4), forearmR: v(0, 0, 1.4),
    }) },
    { t: 1, pose: mix(stance(), {
      rootRz: -0.22, spine: v(0, 0, s.lean - 0.2), head: v(0, 0, -0.35),
      upperArmL: v(-1.0, 0, -0.5), upperArmR: v(1.0, 0, -0.5),
      forearmL: v(0, 0, 1.2), forearmR: v(0, 0, 1.2),
    }) },
  ]);

  const throwClip = (name: string, dur: number, back: boolean): Clip => makeClip(name, dur, false, [
    { t: 0, pose: reach() },
    { t: 0.28, pose: mix(reach(), {
      rootY: 0.14, rootRz: back ? 0.5 : -0.3,
      spine: v(0, 0, back ? s.lean + 0.5 : s.lean - 0.3),
      upperArmL: v(-0.4, 0, 2.1), upperArmR: v(0.4, 0, 2.1),
      forearmL: v(0, 0, 0.15), forearmR: v(0, 0, 0.15),
      thighL: v(-0.1, 0, -0.2), thighR: v(0.1, 0, -0.2),
    }) },
    { t: 0.55, pose: mix(reach(), {
      rootY: -0.16, rootX: back ? -0.1 : 0.14, rootRz: back ? -0.4 : 0.6,
      spine: v(0, 0, s.lean + 0.7),
      upperArmL: v(-0.2, 0, 0.2), upperArmR: v(0.2, 0, 0.2),
      thighL: v(-0.1, 0, 0.8), shinL: v(0, 0, -1.1),
      thighR: v(0.1, 0, 0.2), shinR: v(0, 0, -0.5),
    }) },
    { t: 1, pose: stance() },
  ]);

  const throwForward = throwClip('throwForward', 820, false);
  const throwBack = throwClip('throwBack', 860, true);

  /* ---------------- grounded ---------------- */

  const flatPose = (): Pose => ({
    rootY: -0.62, rootRx: 0, rootRz: -1.42,
    hips: v(0, 0, 0), spine: v(0, 0, 0.1), chest: v(0, 0, 0.1), head: v(0, 0, -0.3),
    upperArmL: v(-1.2, 0, 0.4), upperArmR: v(1.2, 0, 0.4),
    forearmL: v(0, 0, 0.4), forearmR: v(0, 0, 0.4),
    thighL: v(-0.3, 0, 0.35), shinL: v(0, 0, -0.5),
    thighR: v(0.3, 0, 0.15), shinR: v(0, 0, -0.3),
    midArmL: v(-1.2, 0, 0.3), midArmR: v(1.2, 0, 0.3),
    lowArmL: v(-1.0, 0, 0.2), lowArmR: v(1.0, 0, 0.2),
  });

  // Falling accelerates -- that is the one piece of animation timing every
  // viewer already knows by heart -- and a body that hits the mat stops there.
  const knockdown = makeClip('knockdown', 620, false, [
    { t: 0, pose: mix(stance(), { rootRz: -0.5, rootY: 0.06, head: v(0, 0, -0.6) }), ease: 'snap' },
    { t: 0.45, pose: mix(flatPose(), { rootRz: -1.1, rootY: -0.3 }), ease: 'out' },
    { t: 0.62, pose: mix(flatPose(), { rootRz: -0.06, chest: v(0, 0, 0.1) }) },
    { t: 1, pose: flatPose() },
  ]);

  const grounded = makeClip('grounded', 1400, true, [
    { t: 0, pose: flatPose() },
    { t: 0.5, pose: mix(flatPose(), { chest: v(0, 0, 0.2), head: v(0, 0, -0.2), rootY: -0.6 }) },
    { t: 1, pose: flatPose() },
  ]);

  // Getting up is work: slow out of the mat, quick once the legs are under you.
  const getUp = makeClip('getUp', 420, false, [
    { t: 0, pose: flatPose(), ease: 'in' },
    { t: 0.5, pose: mix(stance(), {
      rootY: -0.34, rootRz: -0.5,
      spine: v(0, 0, s.lean + 0.7), thighL: v(-0.2, 0, 1.1), shinL: v(0, 0, -1.5),
      upperArmL: v(-0.7, 0, 1.2), upperArmR: v(0.7, 0, 0.4),
    }), ease: 'out' },
    { t: 0.84, pose: mix(stance(), { rootY: 0.03, spine: v(0, 0, s.lean - 0.08) }) },
    { t: 1, pose: stance() },
  ]);

  const pinned = makeClip('pinned', 900, true, [
    { t: 0, pose: mix(flatPose(), { upperArmL: v(-1.5, 0, 0.1), upperArmR: v(1.5, 0, 0.1) }) },
    { t: 0.5, pose: mix(flatPose(), { upperArmL: v(-1.2, 0, 0.6), upperArmR: v(1.2, 0, 0.6), chest: v(0, 0, 0.22) }) },
    { t: 1, pose: mix(flatPose(), { upperArmL: v(-1.5, 0, 0.1), upperArmR: v(1.5, 0, 0.1) }) },
  ]);

  const pin = makeClip('pin', 900, true, [
    { t: 0, pose: {
      rootY: -0.5, rootRz: -0.95, rootX: 0.1,
      spine: v(0, 0, 0.3), chest: v(0, 0, 0.2), head: v(0, 0, -0.6),
      upperArmL: v(-0.6, 0, 1.5), upperArmR: v(0.6, 0, 1.5),
      forearmL: v(0, 0, 0.3), forearmR: v(0, 0, 0.3),
      thighL: v(-0.3, 0, 0.9), shinL: v(0, 0, -1.6),
      thighR: v(0.3, 0, 0.7), shinR: v(0, 0, -1.4),
    } },
    { t: 0.5, pose: {
      rootY: -0.54, rootRz: -0.95, rootX: 0.1,
      spine: v(0, 0, 0.38), chest: v(0, 0, 0.24), head: v(0, 0, -0.5),
      upperArmL: v(-0.6, 0, 1.6), upperArmR: v(0.6, 0, 1.6),
      forearmL: v(0, 0, 0.25), forearmR: v(0, 0, 0.25),
      thighL: v(-0.3, 0, 0.95), shinL: v(0, 0, -1.6),
      thighR: v(0.3, 0, 0.75), shinR: v(0, 0, -1.4),
    } },
    { t: 1, pose: {
      rootY: -0.5, rootRz: -0.95, rootX: 0.1,
      spine: v(0, 0, 0.3), chest: v(0, 0, 0.2), head: v(0, 0, -0.6),
      upperArmL: v(-0.6, 0, 1.5), upperArmR: v(0.6, 0, 1.5),
      forearmL: v(0, 0, 0.3), forearmR: v(0, 0, 0.3),
      thighL: v(-0.3, 0, 0.9), shinL: v(0, 0, -1.6),
      thighR: v(0.3, 0, 0.7), shinR: v(0, 0, -1.4),
    } },
  ]);

  /* ---------------- performance ---------------- */

  const taunt = makeClip('taunt', 1000, false, [
    { t: 0, pose: stance() },
    { t: 0.3, pose: mix(stance(), {
      rootRz: -0.12, hips: v(0, 0.3 * s.sway, 0), chest: v(0, -0.3, -0.2), head: v(0, -0.3, -0.3),
      upperArmL: v(-1.6 * A, 0, 0.2), forearmL: v(0, 0, 1.5),
      upperArmR: v(1.0, 0, -0.6), forearmR: v(0, 0, 1.9),
    }) },
    { t: 0.62, pose: mix(stance(), {
      rootRz: 0.12, hips: v(0, -0.3 * s.sway, 0), chest: v(0, 0.3, -0.2), head: v(0, 0.3, -0.35),
      upperArmL: v(-1.0, 0, -0.6), forearmL: v(0, 0, 1.9),
      upperArmR: v(1.6 * A, 0, 0.2), forearmR: v(0, 0, 1.5),
    }) },
    { t: 1, pose: stance() },
  ]);

  const signature = makeClip('signature', 980, false, [
    { t: 0, pose: stance() },
    { t: 0.24, pose: mix(stance(), {
      rootY: 0.04, rootRz: -0.24, chest: v(0, -0.5, -0.3),
      upperArmL: v(-1.5 * A, 0, -0.7), upperArmR: v(1.5 * A, 0, -0.7),
      forearmL: v(0, 0, 1.1), forearmR: v(0, 0, 1.1),
    }) },
    { t: 0.46, pose: mix(stance(), {
      rootX: 0.16, rootRz: 0.3, chest: v(0, 0.4, 0.4), head: v(0, 0, 0.1),
      upperArmL: v(-0.25, 0, 1.9), upperArmR: v(0.25, 0, 1.9),
      forearmL: v(0, 0, 0.1), forearmR: v(0, 0, 0.1),
      thighL: v(-0.1, 0, 0.5), shinL: v(0, 0, -0.7),
    }) },
    { t: 0.7, pose: mix(stance(), { rootX: 0.1, rootRz: 0.16, chest: v(0, 0.2, 0.3) }) },
    { t: 1, pose: stance() },
  ]);

  const finisher = makeClip('finisher', 1500, false, [
    { t: 0, pose: stance() },
    { t: 0.16, pose: mix(stance(), {
      rootY: 0.05, chest: v(0, 0, -0.35), head: v(0, 0, -0.4),
      upperArmL: v(-1.8 * A, 0, 0.1), upperArmR: v(1.8 * A, 0, 0.1),
      forearmL: v(0, 0, 0.5), forearmR: v(0, 0, 0.5),
    }) },
    { t: 0.36, pose: mix(stance(), {
      rootY: 0.16, rootRz: -0.2,
      upperArmL: v(-0.6, 0, -0.9), upperArmR: v(0.6, 0, -0.9),
      forearmL: v(0, 0, 1.7), forearmR: v(0, 0, 1.7),
      thighL: v(-0.1, 0, -0.3), thighR: v(0.1, 0, -0.3),
    }) },
    { t: 0.58, pose: mix(stance(), {
      rootY: -0.26, rootX: 0.2, rootRz: 0.7, spine: v(0, 0, s.lean + 0.9),
      upperArmL: v(-0.2, 0, 2.2), upperArmR: v(0.2, 0, 2.2),
      forearmL: v(0, 0, 0.1), forearmR: v(0, 0, 0.1),
      thighL: v(-0.2, 0, 1.0), shinL: v(0, 0, -1.5),
      thighR: v(0.2, 0, 0.2), shinR: v(0, 0, -0.4),
    }) },
    { t: 0.78, pose: mix(stance(), { rootY: -0.1, rootRz: 0.3 }) },
    { t: 1, pose: stance() },
  ]);

  const victory = makeClip('victory', 1800, true, [
    { t: 0, pose: mix(stance(), {
      rootY: 0.0, hips: v(0, 0.2 * s.sway, 0),
      upperArmL: v(-1.9 * A, 0, 0.1), upperArmR: v(1.9 * A, 0, 0.1),
      forearmL: v(0, 0, 0.35), forearmR: v(0, 0, 0.35), head: v(0, 0, -0.25),
    }) },
    { t: 0.5, pose: mix(stance(), {
      rootY: 0.07, hips: v(0, -0.2 * s.sway, 0),
      upperArmL: v(-2.1 * A, 0, 0.1), upperArmR: v(2.1 * A, 0, 0.1),
      forearmL: v(0, 0, 0.2), forearmR: v(0, 0, 0.2), head: v(0, 0, -0.35),
    }) },
    { t: 1, pose: mix(stance(), {
      rootY: 0.0, hips: v(0, 0.2 * s.sway, 0),
      upperArmL: v(-1.9 * A, 0, 0.1), upperArmR: v(1.9 * A, 0, 0.1),
      forearmL: v(0, 0, 0.35), forearmR: v(0, 0, 0.35), head: v(0, 0, -0.25),
    }) },
  ]);

  const defeat = makeClip('defeat', 2000, true, [
    { t: 0, pose: flatPose() },
    { t: 0.5, pose: mix(flatPose(), { rootY: -0.6, chest: v(0, 0.2, 0.16) }) },
    { t: 1, pose: flatPose() },
  ]);

  const entrance = makeClip('entrance', 2200, true, [
    { t: 0, pose: mix(stance(), { rootY: -0.02, hips: v(0, 0.24 * s.sway, 0), chest: v(0, -0.2, -0.05) }) },
    { t: 0.5, pose: mix(stance(), { rootY: 0.03, hips: v(0, -0.24 * s.sway, 0), chest: v(0, 0.2, -0.05) }) },
    { t: 1, pose: mix(stance(), { rootY: -0.02, hips: v(0, 0.24 * s.sway, 0), chest: v(0, -0.2, -0.05) }) },
  ]);

  /* ---------------- running, ropes and the air ---------------- */

  const ropeRun = makeClip('ropeRun', 380, true, [
    { t: 0, pose: mix(stepPose(1, 0.16, 0.95), { spine: v(0, 0, s.lean + 0.3) }) },
    { t: 0.25, pose: mix(stepPose(1, 0.0, 0.1), { spine: v(0, 0, s.lean + 0.34) }) },
    { t: 0.5, pose: mix(stepPose(-1, 0.16, 0.95), { spine: v(0, 0, s.lean + 0.3) }) },
    { t: 0.75, pose: mix(stepPose(-1, 0.0, 0.1), { spine: v(0, 0, s.lean + 0.34) }) },
    { t: 1, pose: mix(stepPose(1, 0.16, 0.95), { spine: v(0, 0, s.lean + 0.3) }) },
  ]);

  /** Arm out, shoulder forward, running through them rather than at them. */
  const runningStrike = makeClip('runningStrike', 580, false, [
    { t: 0, pose: mix(stance(), { spine: v(0, 0, s.lean + 0.3) }) },
    { t: 0.24, pose: mix(stance(), {
      rootX: 0.08, spine: v(0, 0, s.lean + 0.42), chest: v(0, -0.4, 0.1),
      upperArmR: v(1.3 * A, 0, 0.1), forearmR: v(0, 0, 0.5),
      upperArmL: v(-0.5, 0, -0.5),
      thighR: v(0.1, 0, 0.9), shinR: v(0, 0, -1.1),
    }) },
    { t: 0.46, pose: mix(stance(), {
      rootX: 0.22, rootRz: 0.14, chest: v(0, 0.3, 0.16),
      upperArmR: v(0.2, 0, 1.62 * A), forearmR: v(0, 0, 0.06),
      upperArmL: v(-0.8, 0, -0.6),
      thighL: v(-0.1, 0, 0.8), shinL: v(0, 0, -0.9),
      thighR: v(0.1, 0, -0.35),
    }) },
    { t: 0.7, pose: mix(stance(), { rootX: 0.12, rootRz: 0.2 }) },
    { t: 1, pose: stance() },
  ]);

  const reboundStrike = makeClip('reboundStrike', 600, false, [
    { t: 0, pose: mix(stance(), { spine: v(0, 0, s.lean + 0.34) }) },
    { t: 0.2, pose: mix(stance(), {
      rootY: 0.12, rootX: 0.1, spine: v(0, 0, s.lean + 0.1),
      upperArmL: v(-1.5 * A, 0, 0.5), upperArmR: v(1.5 * A, 0, 0.5),
      forearmL: v(0, 0, 0.2), forearmR: v(0, 0, 0.2),
      thighL: v(-0.12, 0, 0.9), shinL: v(0, 0, -1.2),
      thighR: v(0.12, 0, -0.5),
    }) },
    { t: 0.46, pose: mix(stance(), {
      rootY: 0.2, rootX: 0.26, rootRz: 0.32,
      spine: v(0, 0, s.lean - 0.1),
      upperArmL: v(-1.7 * A, 0, 1.0), upperArmR: v(1.7 * A, 0, 1.0),
      forearmL: v(0, 0, 0.1), forearmR: v(0, 0, 0.1),
      thighL: v(-0.14, 0, 0.3), thighR: v(0.14, 0, 0.3),
      shinL: v(0, 0, -0.6), shinR: v(0, 0, -0.6),
    }) },
    { t: 0.74, pose: mix(stance(), { rootY: -0.1, rootX: 0.16, rootRz: 0.3 }) },
    { t: 1, pose: stance() },
  ]);

  const reboundGrapple = makeClip('reboundGrapple', 640, false, [
    { t: 0, pose: mix(reach(), { spine: v(0, 0, s.lean + 0.3) }) },
    { t: 0.26, pose: mix(reach(), { rootX: 0.16, rootY: 0.06 }) },
    { t: 0.5, pose: mix(reach(), {
      rootY: -0.22, rootX: 0.2, rootRz: 0.7, spine: v(0, 0, s.lean + 0.85),
      upperArmL: v(-0.2, 0, 2.1), upperArmR: v(0.2, 0, 2.1),
      thighL: v(-0.16, 0, 0.9), shinL: v(0, 0, -1.4),
    }) },
    { t: 1, pose: stance() },
  ]);

  /** Head-first through the ropes. Nobody looks graceful doing this. */
  const suicideDive = makeClip('suicideDive', 900, false, [
    { t: 0, pose: mix(stance(), { spine: v(0, 0, s.lean + 0.3) }), ease: 'out' },
    { t: 0.2, pose: mix(stance(), {
      rootY: -0.18, spine: v(0, 0, s.lean + 0.7),
      thighL: v(-0.12, 0, 1.0), shinL: v(0, 0, -1.5),
      thighR: v(0.12, 0, 0.9), shinR: v(0, 0, -1.4),
      upperArmL: v(-0.8, 0, -0.8), upperArmR: v(0.8, 0, -0.8),
    }), ease: 'snap' },
    { t: 0.42, pose: {
      rootY: 0.1, rootRz: 1.25, rootX: 0.2,
      spine: v(0, 0, 0.1), chest: v(0, 0, 0.05), head: v(0, 0, -0.55),
      upperArmL: v(-0.5, 0, 1.9), upperArmR: v(0.5, 0, 1.9),
      forearmL: v(0, 0, 0.1), forearmR: v(0, 0, 0.1),
      thighL: v(-0.1, 0, -0.35), thighR: v(0.1, 0, -0.25),
      shinL: v(0, 0, -0.25), shinR: v(0, 0, -0.2),
      midArmL: v(-0.9, 0, 1.6), midArmR: v(0.9, 0, 1.6),
      lowArmL: v(-0.8, 0, 1.4), lowArmR: v(0.8, 0, 1.4),
    } },
    { t: 0.82, pose: {
      rootY: 0.05, rootRz: 1.4, rootX: 0.16,
      spine: v(0, 0, 0.15), head: v(0, 0, -0.4),
      upperArmL: v(-0.6, 0, 1.6), upperArmR: v(0.6, 0, 1.6),
      thighL: v(-0.12, 0, -0.2), thighR: v(0.12, 0, -0.15),
    } },
    { t: 1, pose: flatPose() },
  ]);

  /* ---------------- corner and top rope ---------------- */

  const climb = makeClip('climb', 520, false, [
    { t: 0, pose: stance() },
    { t: 0.45, pose: mix(stance(), {
      rootY: -0.1, spine: v(0, 0, s.lean + 0.2),
      upperArmL: v(-0.9, 0, 1.7), upperArmR: v(0.9, 0, 1.7),
      forearmL: v(0, 0, 0.4), forearmR: v(0, 0, 0.4),
      thighL: v(-0.16, 0, 1.3), shinL: v(0, 0, -1.7),
      thighR: v(0.16, 0, 0.3), shinR: v(0, 0, -0.5),
    }) },
    { t: 1, pose: mix(stance(), {
      rootY: -0.02,
      thighL: v(-0.2, 0, 0.55), shinL: v(0, 0, -0.9),
      thighR: v(0.2, 0, 0.55), shinR: v(0, 0, -0.9),
      upperArmL: v(-0.8, 0, 0.4), upperArmR: v(0.8, 0, 0.4),
    }) },
  ]);

  /** Crouched on the top turnbuckle, arms out, milking it. */
  const perch = makeClip('perch', 1400, true, [
    { t: 0, pose: mix(stance(), {
      rootY: -0.06, spine: v(0, 0, s.lean + 0.18),
      thighL: v(-0.24, 0, 0.7), shinL: v(0, 0, -1.1),
      thighR: v(0.24, 0, 0.7), shinR: v(0, 0, -1.1),
      upperArmL: v(-1.5 * A, 0, 0.3), upperArmR: v(1.5 * A, 0, 0.3),
      forearmL: v(0, 0, 0.3), forearmR: v(0, 0, 0.3),
    }) },
    { t: 0.5, pose: mix(stance(), {
      rootY: 0.02, spine: v(0, 0, s.lean + 0.1),
      thighL: v(-0.24, 0, 0.62), shinL: v(0, 0, -1.0),
      thighR: v(0.24, 0, 0.62), shinR: v(0, 0, -1.0),
      upperArmL: v(-1.75 * A, 0, 0.2), upperArmR: v(1.75 * A, 0, 0.2),
      forearmL: v(0, 0, 0.2), forearmR: v(0, 0, 0.2),
      head: v(0, 0, -0.3),
    }) },
    { t: 1, pose: mix(stance(), {
      rootY: -0.06, spine: v(0, 0, s.lean + 0.18),
      thighL: v(-0.24, 0, 0.7), shinL: v(0, 0, -1.1),
      thighR: v(0.24, 0, 0.7), shinR: v(0, 0, -1.1),
      upperArmL: v(-1.5 * A, 0, 0.3), upperArmR: v(1.5 * A, 0, 0.3),
      forearmL: v(0, 0, 0.3), forearmR: v(0, 0, 0.3),
    }) },
  ]);

  const topRopeDive = makeClip('topRopeDive', 1000, false, [
    { t: 0, pose: mix(stance(), {
      rootY: -0.06,
      thighL: v(-0.24, 0, 0.7), shinL: v(0, 0, -1.1),
      thighR: v(0.24, 0, 0.7), shinR: v(0, 0, -1.1),
      upperArmL: v(-1.5 * A, 0, 0.3), upperArmR: v(1.5 * A, 0, 0.3),
    }) },
    { t: 0.22, pose: mix(stance(), {
      rootY: 0.14, rootRz: -0.2,
      upperArmL: v(-2.0 * A, 0, 0.0), upperArmR: v(2.0 * A, 0, 0.0),
      forearmL: v(0, 0, 0.1), forearmR: v(0, 0, 0.1),
      thighL: v(-0.2, 0, -0.5), thighR: v(0.2, 0, -0.5),
      head: v(0, 0, -0.4),
    }), ease: 'in' },
    { t: 0.55, pose: {
      rootRz: 0.9, rootY: 0.04,
      spine: v(0, 0, 0.1), head: v(0, 0, -0.35),
      upperArmL: v(-1.7, 0, 1.0), upperArmR: v(1.7, 0, 1.0),
      forearmL: v(0, 0, 0.15), forearmR: v(0, 0, 0.15),
      thighL: v(-0.3, 0, 0.2), thighR: v(0.3, 0, 0.2),
      shinL: v(0, 0, -0.3), shinR: v(0, 0, -0.3),
      midArmL: v(-1.5, 0, 0.9), midArmR: v(1.5, 0, 0.9),
      lowArmL: v(-1.3, 0, 0.8), lowArmR: v(1.3, 0, 0.8),
    } },
    { t: 0.86, pose: {
      rootRz: 1.35, rootY: -0.2,
      upperArmL: v(-1.4, 0, 0.7), upperArmR: v(1.4, 0, 0.7),
      thighL: v(-0.3, 0, 0.35), thighR: v(0.3, 0, 0.3),
    } },
    { t: 1, pose: flatPose() },
  ]);

  /** Mounted in the corner, throwing elbows down while the crowd counts. */
  const cornerAttack = makeClip('cornerAttack', 860, false, [
    { t: 0, pose: stance() },
    { t: 0.2, pose: mix(stance(), {
      rootY: 0.06, rootX: 0.1,
      upperArmL: v(-1.2, 0, 1.2), upperArmR: v(1.2 * A, 0, -0.6),
      forearmR: v(0, 0, 1.8), forearmL: v(0, 0, 0.6),
      thighR: v(0.12, 0, 0.9), shinR: v(0, 0, -1.2),
    }) },
    { t: 0.42, pose: mix(stance(), {
      rootY: 0.08, rootX: 0.14,
      upperArmL: v(-1.2, 0, 1.2), upperArmR: v(0.2, 0, 1.7),
      forearmR: v(0, 0, 0.1), forearmL: v(0, 0, 0.6),
      thighR: v(0.12, 0, 0.9), shinR: v(0, 0, -1.2),
    }) },
    { t: 0.62, pose: mix(stance(), {
      rootY: 0.06, rootX: 0.1,
      upperArmL: v(-0.2, 0, 1.7), upperArmR: v(1.2 * A, 0, -0.6),
      forearmL: v(0, 0, 0.1), forearmR: v(0, 0, 1.8),
      thighR: v(0.12, 0, 0.9), shinR: v(0, 0, -1.2),
    }) },
    { t: 0.82, pose: mix(stance(), {
      rootY: 0.08, rootX: 0.14,
      upperArmL: v(-1.4, 0, 1.4), upperArmR: v(1.4, 0, 1.4),
    }) },
    { t: 1, pose: stance() },
  ]);

  /** Slumped in the corner after being thrown into it. */
  const cornered = makeClip('cornered', 900, true, [
    { t: 0, pose: mix(stance(), {
      rootY: -0.2, rootRz: -0.12, spine: v(0, 0, s.lean + 0.32), head: v(0, 0, -0.55),
      upperArmL: v(-1.5, 0, -0.3), upperArmR: v(1.5, 0, -0.3),
      forearmL: v(0, 0, 0.6), forearmR: v(0, 0, 0.6),
      thighL: v(-0.18, 0, 0.5), shinL: v(0, 0, -0.8),
      thighR: v(0.18, 0, 0.4), shinR: v(0, 0, -0.7),
    }) },
    { t: 0.5, pose: mix(stance(), {
      rootY: -0.26, rootRz: 0.1, spine: v(0, 0, s.lean + 0.4), head: v(0, 0, -0.35),
      upperArmL: v(-1.3, 0, -0.5), upperArmR: v(1.3, 0, -0.5),
      forearmL: v(0, 0, 0.8), forearmR: v(0, 0, 0.8),
      thighL: v(-0.18, 0, 0.6), shinL: v(0, 0, -0.9),
      thighR: v(0.18, 0, 0.5), shinR: v(0, 0, -0.8),
    }) },
    { t: 1, pose: mix(stance(), {
      rootY: -0.2, rootRz: -0.12, spine: v(0, 0, s.lean + 0.32), head: v(0, 0, -0.55),
      upperArmL: v(-1.5, 0, -0.3), upperArmR: v(1.5, 0, -0.3),
      forearmL: v(0, 0, 0.6), forearmR: v(0, 0, 0.6),
      thighL: v(-0.18, 0, 0.5), shinL: v(0, 0, -0.8),
      thighR: v(0.18, 0, 0.4), shinR: v(0, 0, -0.7),
    }) },
  ]);

  /** Sent into the ropes by someone else: arms flailing, no control. */
  const whipped = makeClip('whipped', 420, true, [
    { t: 0, pose: mix(stance(), {
      rootRz: -0.18, spine: v(0, 0, s.lean - 0.2),
      upperArmL: v(-1.3, 0, -0.8), upperArmR: v(1.3, 0, -0.8),
      thighL: v(-0.12, 0, 0.8), shinL: v(0, 0, -1.0),
    }) },
    { t: 0.5, pose: mix(stance(), {
      rootRz: 0.18, spine: v(0, 0, s.lean - 0.1),
      upperArmL: v(-1.1, 0, -1.0), upperArmR: v(1.1, 0, -1.0),
      thighR: v(0.12, 0, 0.8), shinR: v(0, 0, -1.0),
    }) },
    { t: 1, pose: mix(stance(), {
      rootRz: -0.18, spine: v(0, 0, s.lean - 0.2),
      upperArmL: v(-1.3, 0, -0.8), upperArmR: v(1.3, 0, -0.8),
      thighL: v(-0.12, 0, 0.8), shinL: v(0, 0, -1.0),
    }) },
  ]);

  const apron = makeClip('apron', 1400, true, [
    { t: 0, pose: mix(stance(), {
      rootY: -0.02, upperArmL: v(-0.9, 0, 0.9), upperArmR: v(0.9, 0, 0.9),
      forearmL: v(0, 0, 0.3), forearmR: v(0, 0, 0.3),
    }) },
    { t: 0.5, pose: mix(stance(), {
      rootY: 0.02, upperArmL: v(-1.0, 0, 1.0), upperArmR: v(1.0, 0, 1.0),
      forearmL: v(0, 0, 0.25), forearmR: v(0, 0, 0.25), head: v(0, 0.2, -0.1),
    }) },
    { t: 1, pose: mix(stance(), {
      rootY: -0.02, upperArmL: v(-0.9, 0, 0.9), upperArmR: v(0.9, 0, 0.9),
      forearmL: v(0, 0, 0.3), forearmR: v(0, 0, 0.3),
    }) },
  ]);

  const pickUp = makeClip('pickUp', 420, false, [
    { t: 0, pose: stance() },
    { t: 0.5, pose: mix(stance(), {
      rootY: -0.3, spine: v(0, 0, s.lean + 0.8),
      upperArmL: v(-0.5, 0, 1.5), upperArmR: v(0.5, 0, 1.5),
      forearmL: v(0, 0, 0.4), forearmR: v(0, 0, 0.4),
      thighL: v(-0.16, 0, 1.0), shinL: v(0, 0, -1.4),
      thighR: v(0.16, 0, 0.9), shinR: v(0, 0, -1.3),
    }) },
    { t: 1, pose: stance() },
  ]);

  /** Two-handed swing with something far too large to be legal. */
  const propSwing = makeClip('propSwing', 800, false, [
    { t: 0, pose: mix(stance(), {
      upperArmL: v(-0.6, 0, 0.9), upperArmR: v(0.6, 0, 0.9),
      forearmL: v(0, 0, 0.8), forearmR: v(0, 0, 0.8),
    }) },
    { t: 0.3, pose: mix(stance(), {
      rootRz: -0.26, hips: v(0, -0.6, 0), chest: v(0, -0.8, -0.1),
      upperArmL: v(-1.4, 0, -0.5), upperArmR: v(0.2, 0, -0.9),
      forearmL: v(0, 0, 1.1), forearmR: v(0, 0, 1.2),
    }) },
    { t: 0.5, pose: mix(stance(), {
      rootRz: 0.3, rootX: 0.1, hips: v(0, 0.7, 0), chest: v(0, 0.9, 0.16),
      upperArmL: v(-0.2, 0, 1.8), upperArmR: v(0.4, 0, 1.7),
      forearmL: v(0, 0, 0.15), forearmR: v(0, 0, 0.2),
      thighL: v(-0.12, 0, 0.4), thighR: v(0.12, 0, -0.1),
    }) },
    { t: 0.76, pose: mix(stance(), { rootRz: 0.18, chest: v(0, 0.4, 0.1) }) },
    { t: 1, pose: stance() },
  ]);

  /* ---------------- behind them ---------------- */

  /** A clubbing blow to the back of someone who is not looking. */
  const backAttack = makeClip('backAttack', 460, false, [
    { t: 0, pose: stance() },
    { t: 0.3, pose: mix(stance(), {
      rootRz: -0.14, chest: v(0, -0.55, -0.2),
      upperArmL: v(-1.7 * A, 0, -0.3), forearmL: v(0, 0, 1.3),
      upperArmR: v(1.7 * A, 0, -0.3), forearmR: v(0, 0, 1.3),
    }) },
    { t: 0.5, pose: mix(stance(), {
      rootX: 0.1, rootRz: 0.24, spine: v(0, 0, s.lean + 0.45),
      upperArmL: v(-0.3, 0, 1.75 * A), forearmL: v(0, 0, 0.12),
      upperArmR: v(0.3, 0, 1.75 * A), forearmR: v(0, 0, 0.12),
      thighL: v(-0.1, 0, 0.35),
    }) },
    { t: 0.74, pose: mix(stance(), { rootRz: 0.12, spine: v(0, 0, s.lean + 0.2) }) },
    { t: 1, pose: stance() },
  ]);

  /** Waistlock from behind: arms low and clamped, weight dropped. */
  const rearHold = (): Pose => mix(stance(), {
    rootX: 0.06, rootY: -0.06,
    spine: v(0, 0, s.lean + 0.2),
    upperArmL: v(-0.85, 0, 1.15 * A), forearmL: v(0, 0, 0.75),
    upperArmR: v(0.85, 0, 1.15 * A), forearmR: v(0, 0, 0.75),
    thighL: v(-0.14 * s.stance, 0, 0.3), shinL: v(0, 0, -0.5),
    thighR: v(0.14 * s.stance, 0, 0.3), shinR: v(0, 0, -0.5),
    midArmL: v(-1.1, 0, 1.0), midArmR: v(1.1, 0, 1.0),
  });

  const rearGrapple = makeClip('rearGrapple', 340, false, [
    { t: 0, pose: stance() },
    { t: 0.55, pose: mix(rearHold(), { rootX: 0.12 }) },
    { t: 1, pose: rearHold() },
  ]);

  /** Back suplex: arch up and over, landing behind. */
  const rearThrow = makeClip('rearThrow', 900, false, [
    { t: 0, pose: rearHold() },
    { t: 0.26, pose: mix(rearHold(), {
      rootY: -0.16, spine: v(0, 0, s.lean + 0.55),
      thighL: v(-0.16, 0, 0.9), shinL: v(0, 0, -1.3),
      thighR: v(0.16, 0, 0.9), shinR: v(0, 0, -1.3),
    }) },
    { t: 0.48, pose: mix(rearHold(), {
      rootY: 0.2, rootRz: -0.75,
      spine: v(0, 0, s.lean - 0.5), chest: v(0, 0, -0.3), head: v(0, 0, 0.4),
      upperArmL: v(-0.6, 0, 1.5), upperArmR: v(0.6, 0, 1.5),
      thighL: v(-0.14, 0, -0.35), thighR: v(0.14, 0, -0.35),
    }) },
    { t: 0.72, pose: mix(stance(), {
      rootY: -0.3, rootRz: -1.25,
      spine: v(0, 0, 0.1), head: v(0, 0, 0.2),
      upperArmL: v(-1.0, 0, 0.6), upperArmR: v(1.0, 0, 0.6),
      thighL: v(-0.2, 0, 0.5), shinL: v(0, 0, -0.9),
    }) },
    { t: 1, pose: mix(stance(), { rootY: -0.12, rootRz: -0.3 }) },
  ]);

  /** The victim half of a rear throw: folded backwards over the attacker. */
  const takenBack = makeClip('takenBack', 900, false, [
    { t: 0, pose: mix(stance(), { rootRz: 0.1, head: v(0, 0, -0.3) }) },
    { t: 0.3, pose: mix(stance(), {
      rootY: 0.1, rootRz: 0.5, spine: v(0, 0, -0.35),
      upperArmL: v(-1.4, 0, -0.7), upperArmR: v(1.4, 0, -0.7),
      thighL: v(-0.12, 0, -0.5), thighR: v(0.12, 0, -0.5),
    }) },
    { t: 0.52, pose: {
      rootY: 0.34, rootRz: 1.5,
      spine: v(0, 0, 0.1), head: v(0, 0, 0.5),
      upperArmL: v(-1.5, 0, -0.5), upperArmR: v(1.5, 0, -0.5),
      thighL: v(-0.2, 0, 0.3), thighR: v(0.2, 0, 0.25),
      shinL: v(0, 0, -0.4), shinR: v(0, 0, -0.35),
    } },
    { t: 0.78, pose: flatPose() },
    { t: 1, pose: flatPose() },
  ]);

  /** The victim half of a front throw: picked up and driven down. */
  const takenFront = makeClip('takenFront', 820, false, [
    { t: 0, pose: mix(stance(), { rootRz: -0.12, head: v(0, 0, -0.35) }) },
    { t: 0.3, pose: mix(stance(), {
      rootY: 0.3, rootRz: -0.9,
      upperArmL: v(-1.5, 0, -0.4), upperArmR: v(1.5, 0, -0.4),
      thighL: v(-0.16, 0, -0.4), thighR: v(0.16, 0, -0.4),
    }) },
    { t: 0.58, pose: mix(flatPose(), { rootY: -0.3, rootRz: -1.6 }) },
    { t: 1, pose: flatPose() },
  ]);

  /* ---------------- taunts: gameplay, not decoration ---------------- */

  const tauntShort = makeClip('tauntShort', 620, false, [
    { t: 0, pose: stance() },
    { t: 0.4, pose: mix(stance(), {
      rootRz: -0.08, hips: v(0, 0.24 * s.sway, 0), head: v(0, -0.35, -0.15),
      upperArmR: v(0.6, 0, 0.3), forearmR: v(0, 0, 2.0),
    }) },
    { t: 1, pose: stance() },
  ]);

  const tauntBig = makeClip('tauntBig', 1700, false, [
    { t: 0, pose: stance() },
    { t: 0.22, pose: mix(stance(), {
      rootY: 0.03, hips: v(0, 0.36 * s.sway, 0), chest: v(0, -0.36, -0.28),
      upperArmL: v(-1.9 * A, 0, 0.1), forearmL: v(0, 0, 0.5),
      upperArmR: v(1.1, 0, -0.7), forearmR: v(0, 0, 2.0), head: v(0, -0.3, -0.35),
    }) },
    { t: 0.52, pose: mix(stance(), {
      rootY: 0.06, hips: v(0, -0.36 * s.sway, 0), chest: v(0, 0.36, -0.28),
      upperArmL: v(-1.1, 0, -0.7), forearmL: v(0, 0, 2.0),
      upperArmR: v(1.9 * A, 0, 0.1), forearmR: v(0, 0, 0.5), head: v(0, 0.3, -0.35),
    }) },
    { t: 0.78, pose: mix(stance(), {
      rootY: 0.04, chest: v(0, 0, -0.34),
      upperArmL: v(-2.1 * A, 0, 0.1), upperArmR: v(2.1 * A, 0, 0.1),
      forearmL: v(0, 0, 0.2), forearmR: v(0, 0, 0.2), head: v(0, 0, -0.45),
    }) },
    { t: 1, pose: stance() },
  ]);

  const tauntCrowd = makeClip('tauntCrowd', 1500, false, [
    { t: 0, pose: stance() },
    { t: 0.26, pose: mix(stance(), {
      rootRz: -0.1, chest: v(0, -1.0, -0.2), head: v(0, -1.0, -0.3),
      upperArmL: v(-1.9 * A, 0, 0.5), forearmL: v(0, 0, 0.4),
      upperArmR: v(1.1, 0, 0.4), forearmR: v(0, 0, 1.4),
    }) },
    { t: 0.58, pose: mix(stance(), {
      rootRz: 0.1, chest: v(0, 1.0, -0.2), head: v(0, 1.0, -0.3),
      upperArmR: v(1.9 * A, 0, 0.5), forearmR: v(0, 0, 0.4),
      upperArmL: v(-1.1, 0, 0.4), forearmL: v(0, 0, 1.4),
    }) },
    { t: 0.84, pose: mix(stance(), {
      chest: v(0, 0, -0.3), head: v(0, 0, -0.5),
      upperArmL: v(-2.2 * A, 0, 0.0), upperArmR: v(2.2 * A, 0, 0.0),
      forearmL: v(0, 0, 0.1), forearmR: v(0, 0, 0.1),
    }) },
    { t: 1, pose: stance() },
  ]);

  const tauntOpponent = makeClip('tauntOpponent', 1050, false, [
    { t: 0, pose: stance() },
    { t: 0.32, pose: mix(stance(), {
      rootY: -0.12, spine: v(0, 0, s.lean + 0.42), head: v(0, 0, 0.3),
      upperArmR: v(0.5, 0, 1.3), forearmR: v(0, 0, 0.5),
      upperArmL: v(-1.2, 0, -0.4), forearmL: v(0, 0, 1.5),
      thighL: v(-0.12, 0, 0.5), shinL: v(0, 0, -0.7),
    }) },
    { t: 0.66, pose: mix(stance(), {
      rootY: -0.16, spine: v(0, 0, s.lean + 0.5), head: v(0, 0, 0.35),
      upperArmR: v(0.3, 0, 1.6), forearmR: v(0, 0, 0.2),
      upperArmL: v(-1.4, 0, -0.2), forearmL: v(0, 0, 1.7),
    }) },
    { t: 1, pose: stance() },
  ]);

  return {
    idle, walk, run, ropeRun, whipped, apron,
    lightAttack1, lightAttack2, lightAttack3, heavyAttack, groundStrike,
    runningStrike, reboundStrike, reboundGrapple, suicideDive,
    climb, perch, topRopeDive, cornerAttack, cornered,
    hitFront, hitBack, reversal,
    grappleStart, grappleHold, grappled, throwForward, throwBack, pickUp, propSwing,
    backAttack, rearGrapple, rearThrow, takenBack, takenFront,
    knockdown, grounded, getUp, pin, pinned,
    taunt, tauntShort, tauntBig, tauntCrowd, tauntOpponent,
    signature, finisher, victory, defeat, entrance,
  };
}
