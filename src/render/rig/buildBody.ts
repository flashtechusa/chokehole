import type { Scene } from '@babylonjs/core/scene';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { BodyBuilder, type Bones, type RigSpec } from './Skeleton';

/**
 * Turns a RigSpec into geometry.
 *
 * Axis convention: the skeleton faces +X, so a box's `width` argument is the
 * fighter's front-to-back thickness, `depth` is shoulder-to-shoulder width, and
 * `height` is height. Everything is placed relative to its bone's joint.
 *
 * These are deliberately stylised placeholder models built from primitives.
 * They are true 3D and swap out for approved GLB assets without touching
 * gameplay (Bible s23).
 */
export function buildBody(scene: Scene, bones: Bones, spec: RigSpec, name: string): Mesh[] {
  const b = new BodyBuilder(scene, name);
  const p = spec.proportions;
  const c = spec.palette;
  const K = p.bulk;

  buildLegs(b, bones, spec, K);
  buildTorso(b, bones, spec, K);
  buildArms(b, bones, spec, K);
  if (spec.head.kind === 'glam') buildGlamHead(b, bones, spec);
  else buildInsectHead(b, bones, spec);
  buildExtras(b, bones, spec, K);

  void c; void p;
  return b.finish();
}

/* ------------------------------------------------------------------ */

function buildLegs(b: BodyBuilder, n: Bones, s: RigSpec, K: number): void {
  const p = s.proportions;
  const c = s.palette;
  const thighLen = p.legLen * 0.48;
  const shinLen = p.legLen * 0.46;
  const legSkin = s.costume.trunks ? c.skin : c.skin;

  for (const side of ['L', 'R'] as const) {
    const th = n[`thigh${side}` as const];
    const sh = n[`shin${side}` as const];
    const ft = n[`foot${side}` as const];
    b.limb(th, legSkin, thighLen, 0.17 * K, 0.13 * K);
    b.limb(sh, legSkin, shinLen, 0.12 * K, 0.10 * K);

    if (p.heel > 0.09) {
      // Platform: a solid block under the foot reads instantly at match camera.
      b.box(ft, c.boot, 0.30, p.heel, 0.15 * K, { pos: [0.06, -p.heel / 2, 0] });
      b.box(ft, c.boot, 0.16, 0.20, 0.14 * K, { pos: [-0.01, 0.06, 0] });
      b.box(ft, c.accent, 0.31, 0.035, 0.155 * K, { pos: [0.06, -p.heel + 0.02, 0] });
    } else {
      // Chunky sneaker.
      b.box(ft, c.boot, 0.32, 0.13, 0.19 * K, { pos: [0.07, -0.04, 0] });
      b.box(ft, c.accent, 0.33, 0.04, 0.20 * K, { pos: [0.07, -0.10, 0] });
      b.box(ft, c.trim, 0.16, 0.13, 0.185 * K, { pos: [-0.02, 0.06, 0] });
    }
  }
}

function buildTorso(b: BodyBuilder, n: Bones, s: RigSpec, K: number): void {
  const p = s.proportions;
  const c = s.palette;
  const hourglass = s.costume.top === 'leotard';

  // pelvis
  const hipW = p.hipW * K;
  b.box(n.hips, s.costume.trunks ? c.alt : c.main, 0.26 * K, 0.22, hipW, { pos: [0, 0.02, 0] });
  if (hourglass) {
    // hip flare, the silhouette that reads as Jassy from any angle
    b.sphere(n.hips, c.main, 0.26, { pos: [0, 0.0, hipW * 0.46], scale: [0.9, 0.8, 1.1] });
    b.sphere(n.hips, c.main, 0.26, { pos: [0, 0.0, -hipW * 0.46], scale: [0.9, 0.8, 1.1] });
  }
  if (s.costume.beltBuckle) {
    b.box(n.hips, c.accent, 0.05, 0.09, 0.14, { pos: [0.13 * K, 0.06, 0] });
  }

  // waist
  const waist = hourglass ? 0.17 * K : 0.25 * K;
  b.cyl(n.spine, c.main, p.torsoLen * 0.4, waist * 1.35, waist, { pos: [0, p.torsoLen * 0.1, 0] });

  // ribcage / chest
  const shW = p.shoulderW * K;
  b.box(n.chest, c.main, 0.24 * K, p.torsoLen * 0.34, shW * 0.94, { pos: [0, p.torsoLen * 0.04, 0] });
  b.sphere(n.chest, c.main, shW * 0.52, { pos: [0, p.torsoLen * 0.16, shW * 0.4], scale: [0.85, 0.95, 1] });
  b.sphere(n.chest, c.main, shW * 0.52, { pos: [0, p.torsoLen * 0.16, -shW * 0.4], scale: [0.85, 0.95, 1] });

  if (hourglass) {
    // bust
    b.sphere(n.chest, c.main, 0.21 * K, { pos: [0.11 * K, p.torsoLen * 0.1, 0.09 * K] });
    b.sphere(n.chest, c.main, 0.21 * K, { pos: [0.11 * K, p.torsoLen * 0.1, -0.09 * K] });
    b.sphere(n.chest, c.trim, 0.07, { pos: [0.18 * K, p.torsoLen * 0.12, 0.09 * K] });
    b.sphere(n.chest, c.trim, 0.07, { pos: [0.18 * K, p.torsoLen * 0.12, -0.09 * K] });
  }
  if (s.costume.scalePanels) {
    // carapace plates down the back
    for (let i = 0; i < 3; i++) {
      b.box(n.chest, c.trim, 0.1, 0.09, shW * (0.8 - i * 0.14),
        { pos: [-0.13 * K, p.torsoLen * 0.16 - i * 0.11, 0] });
    }
  }
  if (s.costume.collar) {
    b.cyl(n.neck, c.accent, 0.07, 0.2 * K, 0.26 * K, { pos: [0, -0.02, 0] });
  }
  if (s.costume.tie) {
    // Pink collar points either side of the throat, and a black tie hanging
    // down the plunge. In every reference shot this is what breaks up an
    // otherwise solid black front, so it is worth the three primitives.
    for (const side of [1, -1]) {
      b.box(n.chest, c.accent, 0.06, 0.13, 0.09 * K,
        { pos: [0.12 * K, p.torsoLen * 0.3, side * 0.07 * K], rot: [side * 0.3, 0, 0.25] });
    }
    b.box(n.chest, c.boot, 0.05, 0.26, 0.07 * K,
      { pos: [0.135 * K, p.torsoLen * 0.08, 0] });
    b.box(n.chest, c.boot, 0.05, 0.08, 0.055 * K,
      { pos: [0.14 * K, p.torsoLen * 0.26, 0] });
  }
  if (s.costume.backEmblem === 'bolt') {
    // A lightning bolt across the shoulder blades: two offset bars, which is
    // all a bolt needs to be at this size.
    b.box(n.chest, c.accent, 0.05, 0.19, 0.07 * K,
      { pos: [-0.135 * K, p.torsoLen * 0.2, 0.05 * K], rot: [0, 0, 0.5] });
    b.box(n.chest, c.accent, 0.05, 0.19, 0.07 * K,
      { pos: [-0.135 * K, p.torsoLen * 0.02, -0.03 * K], rot: [0, 0, 0.5] });
  }
  if (s.extras.shoulderPads) {
    for (const side of [1, -1]) {
      b.sphere(n.chest, c.trim, 0.24 * K,
        { pos: [0, p.torsoLen * 0.2, side * shW * 0.52], scale: [0.9, 0.62, 0.9] });
    }
  }

  // neck
  b.cyl(n.neck, c.skinShade, p.neckLen + 0.04, 0.09 * K, 0.11 * K, { pos: [0, p.neckLen * 0.4, 0] });
}

function buildArms(b: BodyBuilder, n: Bones, s: RigSpec, K: number): void {
  const p = s.proportions;
  const c = s.palette;
  const upper = p.armLen * 0.48;
  const fore = p.armLen * 0.44;

  for (const side of ['L', 'R'] as const) {
    const sgn = side === 'L' ? 1 : -1;
    const ua = n[`upperArm${side}` as const];
    const fa = n[`forearm${side}` as const];
    const hd = n[`hand${side}` as const];

    if (s.costume.puffSleeves) {
      // The sleeves sit on each shoulder, never merged into one blob on the chest.
      b.sphere(ua, c.accent, 0.28 * K, { pos: [0, -0.03, 0], scale: [1, 0.92, 1.05] });
    }
    /*
     * A jacket sleeve runs the whole arm. Only the shoulder was coloured
     * before, which left bare arms under a puff and lost the jacket entirely —
     * the reference has pink from shoulder to wrist with a bare hand.
     */
    const sleeve = s.costume.longSleeves ? c.accent : c.skin;
    b.limb(ua, sleeve, upper, 0.125 * K, 0.10 * K);
    b.limb(fa, s.costume.longSleeves ? c.accent : (s.costume.gloves ? c.alt : c.skin),
      fore, 0.10 * K, 0.085 * K);
    b.sphere(hd, s.costume.longSleeves ? c.skin : (s.costume.gloves ? c.alt : c.skin),
      0.115 * K, { pos: [0, -0.02, 0] });
    void sgn;
  }
}

function buildGlamHead(b: BodyBuilder, n: Bones, s: RigSpec): void {
  const c = s.palette;
  const r = s.proportions.headR;

  // skull
  b.sphere(n.head, c.skin, r * 2, { pos: [0, r * 0.85, 0], scale: [0.92, 1.06, 0.9] });
  // jaw
  b.box(n.head, c.skin, r * 1.2, r * 0.5, r * 1.25, { pos: [r * 0.16, r * 0.34, 0] });

  if (s.head.wig === 'bouffant') {
    /*
     * A two-tone bouffant: a big blonde mass sitting wider and taller than the
     * skull, with the dark under-layer showing at the fringe and under the
     * sweeps. This is the silhouette that identifies her from across the room,
     * and a bob was never it.
     */
    b.sphere(n.head, c.hair, r * 3.1, { pos: [-r * 0.2, r * 1.5, 0], scale: [0.92, 0.82, 1.08] });
    b.sphere(n.head, c.hair, r * 2.3, { pos: [r * 0.35, r * 1.8, 0], scale: [0.9, 0.8, 1.0] });
    // volume flaring out over each ear
    for (const side of [1, -1]) {
      b.sphere(n.head, c.hair, r * 1.7,
        { pos: [-r * 0.1, r * 1.1, side * r * 1.35], scale: [1.0, 0.95, 0.85] });
    }
    // the dark under-layer, showing at the fringe and below the flare
    b.box(n.head, c.hairLo, r * 0.55, r * 0.5, r * 1.9, { pos: [r * 0.78, r * 1.18, 0] });
    for (const side of [1, -1]) {
      b.box(n.head, c.hairLo, r * 1.0, r * 1.1, r * 0.5,
        { pos: [r * 0.05, r * 0.32, side * r * 1.0] });
    }
  } else if (s.head.wig === 'bob') {
    // Bob: a shell behind and around the face, never painted over it.
    b.sphere(n.head, c.hair, r * 2.2, { pos: [-r * 0.16, r * 0.95, 0], scale: [0.98, 1.0, 1.02] });
    b.box(n.head, c.hair, r * 1.5, r * 1.5, r * 2.3, { pos: [-r * 0.5, r * 0.35, 0] });
    // side sweeps framing the cheeks
    for (const side of [1, -1]) {
      b.box(n.head, c.hair, r * 1.1, r * 1.7, r * 0.42,
        { pos: [r * 0.12, r * 0.2, side * r * 0.92] });
    }
    // blunt fringe
    b.box(n.head, c.hairLo, r * 0.5, r * 0.42, r * 1.75, { pos: [r * 0.72, r * 1.36, 0] });
  }

  // face: eyes, lashes, lips
  for (const side of [1, -1]) {
    b.sphere(n.head, c.eye, r * 0.34, { pos: [r * 0.76, r * 1.0, side * r * 0.36], scale: [0.5, 1, 1] });
    if (s.head.lashes) {
      b.box(n.head, c.hair, r * 0.1, r * 0.07, r * 0.5,
        { pos: [r * 0.86, r * 1.18, side * r * 0.38], rot: [0, 0, -0.2] });
    }
  }
  if (s.head.lips) {
    b.sphere(n.head, c.trim, r * 0.42, { pos: [r * 0.82, r * 0.44, 0], scale: [0.5, 0.55, 1.15] });
  }
}

function buildInsectHead(b: BodyBuilder, n: Bones, s: RigSpec): void {
  const c = s.palette;
  const r = s.proportions.headR;

  // wide wedge skull
  b.box(n.head, c.main, r * 1.9, r * 1.5, r * 2.1, { pos: [r * 0.1, r * 0.9, 0] });
  b.sphere(n.head, c.main, r * 1.9, { pos: [-r * 0.4, r * 1.0, 0], scale: [0.9, 0.95, 1] });

  if (s.head.compoundEyes) {
    for (const side of [1, -1]) {
      b.sphere(n.head, c.eye, r * 0.92,
        { pos: [r * 0.7, r * 1.18, side * r * 0.72], scale: [0.7, 0.9, 0.8] });
      b.sphere(n.head, c.trim, r * 0.3,
        { pos: [r * 0.95, r * 1.24, side * r * 0.78], scale: [0.5, 1, 1] });
    }
  }
  if (s.head.mandibles) {
    // maw: an open ring of teeth reads as RAID from across the ring
    b.cyl(n.head, c.trim, r * 0.34, r * 1.5, r * 1.15, { pos: [r * 0.95, r * 0.44, 0], rot: [0, 0, Math.PI / 2] });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      b.box(n.head, c.skin, r * 0.2, r * 0.3, r * 0.16, {
        pos: [r * 1.02, r * 0.44 + Math.sin(a) * r * 0.5, Math.cos(a) * r * 0.52],
      });
    }
    for (const side of [1, -1]) {
      b.box(n.head, c.alt, r * 0.8, r * 0.18, r * 0.2,
        { pos: [r * 1.25, r * 0.34, side * r * 0.46], rot: [0, 0, side * 0.22] });
    }
  }
}

function buildExtras(b: BodyBuilder, n: Bones, s: RigSpec, K: number): void {
  const c = s.palette;
  const p = s.proportions;

  const pairs = s.extras.extraArmPairs ?? 0;
  if (pairs >= 1) {
    for (const side of ['L', 'R'] as const) {
      const bone = n[`midArm${side}` as const];
      b.limb(bone, c.alt, p.armLen * 0.52, 0.085 * K, 0.055 * K);
      b.sphere(bone, c.trim, 0.09 * K, { pos: [0, -p.armLen * 0.52, 0] });
    }
  }
  if (pairs >= 2) {
    for (const side of ['L', 'R'] as const) {
      const bone = n[`lowArm${side}` as const];
      b.limb(bone, c.alt, p.armLen * 0.44, 0.075 * K, 0.05 * K);
      b.sphere(bone, c.trim, 0.08 * K, { pos: [0, -p.armLen * 0.44, 0] });
    }
  }
  if (s.head.antennae) {
    for (const side of ['L', 'R'] as const) {
      const bone = n[`antenna${side}` as const];
      b.limb(bone, c.trim, 0.3, 0.035, 0.02);
      b.sphere(bone, c.accent, 0.075, { pos: [0, -0.3, 0] });
    }
  }

  const prop = s.extras.hipProp ?? 'none';
  if (prop === 'brickphone') {
    // Generic prop geometry; the approved version drops in as a GLB later.
    b.box(n.hips, c.accent, 0.07, 0.2, 0.1, { pos: [0.02, 0.02, -p.hipW * 0.58] });
    b.cyl(n.hips, c.trim, 0.11, 0.022, 0.022, { pos: [0.02, 0.16, -p.hipW * 0.58] });
  } else if (prop === 'canister') {
    b.cyl(n.hips, c.trim, 0.24, 0.11, 0.11, { pos: [-0.06, 0.04, -p.hipW * 0.6] });
    b.cyl(n.hips, c.accent, 0.05, 0.06, 0.06, { pos: [-0.06, 0.18, -p.hipW * 0.6] });
  }
}
