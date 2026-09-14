import type { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3, Vector4 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import '@babylonjs/core/Rendering/outlineRenderer';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { TUNING } from '@/game/config/tuning';
import { C } from '@/game/config/canon';
import { flatMaterial } from './rig/Skeleton';
import { apronTexture, emissiveMat, matTexture } from './textures';

export interface Ring {
  root: TransformNode;
  /** Rope segments, so slams can make them shudder. */
  ropes: Mesh[];
  posts: Mesh[];
  /** Everything carrying an ink outline, so the quality tier can drop it. */
  inked: Mesh[];
}

/**
 * A real 3D ring: raised apron, painted canvas, four posts, three ropes a side,
 * turnbuckle pads. Built to the dimensions the simulation actually uses, so what
 * the player sees is what the collision does.
 */
/**
 * Ink line on the ring's hard furniture, to match the wrestlers. Ropes are left
 * bare: they are 6cm cylinders, and an outline that width doubles their
 * apparent thickness and turns three ropes into three black bars.
 */
const RING_INK = new Color3(0.04, 0.02, 0.06);

export function buildRing(scene: Scene): Ring {
  const root = new TransformNode('ring', scene);
  // Wide across, shallow in depth: the 2.5D play space, built to the exact
  // dimensions the simulation clamps to.
  const H = TUNING.ring.half;
  const HZ = TUNING.ring.halfZ;
  const matY = TUNING.ring.matY;
  const outer = H + 0.55;
  const outerZ = HZ + 0.55;

  // --- base / apron ---
  const apronMat = emissiveMat(scene, 'apronMat', apronTexture(scene), 0.2);
  /*
   * A box maps its two Z faces as mirror images of each other, so the sponsor
   * text on the apron came out backwards on whichever side you were looking at.
   * With a dead side-on camera that band runs across the whole bottom of the
   * screen, so it has to read. Both Z faces get their U flipped; only one of
   * them is ever visible, and this way it is the right one either way.
   */
  const flipU = new Vector4(1, 0, 0, 1);
  const plain = new Vector4(0, 0, 1, 1);
  const faceUV = [flipU, flipU, plain, plain, plain, plain];
  const base = CreateBox(
    'ringBase',
    { width: outer * 2, height: matY, depth: outerZ * 2, faceUV },
    scene,
  );
  base.position.y = matY / 2;
  base.parent = root;
  base.material = apronMat;
  base.receiveShadows = true;
  base.isPickable = false;


  // --- canvas ---
  const mat = CreateBox('ringMat', { width: H * 2 + 0.18, height: 0.08, depth: HZ * 2 + 0.18 }, scene);
  mat.position.y = matY + 0.04;
  mat.parent = root;
  const canvas = matTexture(scene);
  /*
   * A box maps its top face with U across X and V along Z, which printed the
   * canvas artwork side-on: the logo ran away from the camera instead of across
   * it. A quarter turn in UV space puts it the right way up for a hard camera.
   */
  canvas.wAng = -Math.PI / 2;
    /*
   * The canvas and apron are the two biggest surfaces on screen, so their
   * emissive is what a bloom pass picks up first. At 0.3 and 0.5 the whole ring
   * blew out white and the neon had nothing left to be brighter than. Low here,
   * bright on the ropes and posts: that is where the glow belongs.
   */
  const matMat = emissiveMat(scene, 'matMat', canvas, 0.12);
  mat.material = matMat;
  mat.receiveShadows = true;
  mat.isPickable = false;

  // --- posts ---
  const posts: Mesh[] = [];
  const inked: Mesh[] = [];
  const ink = (m: Mesh, width = 0.02): void => {
    m.renderOutline = true;
    m.outlineWidth = width;
    m.outlineColor = RING_INK;
    inked.push(m);
  };
  const postMat = flatMaterial(scene, C.magenta, 0.35);
  const capMat = flatMaterial(scene, C.acid, 0.6);
  const corners: [number, number][] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (const [sx, sz] of corners) {
    const p = CreateCylinder('post', {
      height: TUNING.ring.postHeight, diameterTop: 0.13, diameterBottom: 0.15, tessellation: 8,
    }, scene);
    p.position.set(sx * (H + 0.22), matY + TUNING.ring.postHeight / 2, sz * (HZ + 0.22));
    p.parent = root;
    p.material = postMat;
    p.isPickable = false;
    ink(p);
    posts.push(p);

    const cap = CreateBox('postCap', { width: 0.26, height: 0.2, depth: 0.26 }, scene);
    cap.position.set(p.position.x, matY + TUNING.ring.postHeight, p.position.z);
    cap.parent = root;
    cap.material = capMat;
    cap.isPickable = false;
    ink(cap);

    // turnbuckle pads facing inward on both adjacent sides
    for (const axis of ['x', 'z'] as const) {
      const pad = CreateBox('pad', {
        width: axis === 'x' ? 0.16 : 0.5, height: 0.8, depth: axis === 'x' ? 0.5 : 0.16,
      }, scene);
      pad.position.set(
        p.position.x - (axis === 'x' ? sx * 0.14 : 0),
        matY + 0.72,
        p.position.z - (axis === 'z' ? sz * 0.14 : 0),
      );
      pad.parent = root;
      pad.material = flatMaterial(scene, axis === 'x' ? C.pink : C.squelsh, 0.4);
      pad.isPickable = false;
      ink(pad);
    }
  }

  // --- ropes ---
  const ropes: Mesh[] = [];
  const ropeColors = [C.pink, C.bone, C.squelsh];
  /*
   * The rope nearest the camera is drawn faint. A solid near rope cuts straight
   * across both wrestlers from a three-quarter view, and the ring reads
   * perfectly well with it ghosted — this is the same trick wrestling broadcasts
   * use with a hard camera.
   */
  const nearMats = ropeColors.map((c) => {
    const m = new StandardMaterial(`ropeNear_${c}`, scene);
    const col = Color3.FromHexString(c);
    m.diffuseColor = col;
    m.emissiveColor = col.scale(0.5);
    m.specularColor = new Color3(0, 0, 0);
    m.alpha = 0.26;
    return m;
  });
  TUNING.ring.ropeHeights.forEach((rh, i) => {
    const m = flatMaterial(scene, ropeColors[i % ropeColors.length]!, 0.55);
    for (const [axis, sign] of [['x', 1], ['x', -1], ['z', 1], ['z', -1]] as const) {
      // A rope spanning the X sides runs along Z, and vice versa.
      const span = axis === 'x' ? (HZ + 0.22) * 2 : (H + 0.22) * 2;
      // Fat ropes. At 5.5cm they were hairlines at match distance; the
      // reference art runs them thick and bright so they read as part of the
      // drawing rather than as wireframe.
      const rope = CreateCylinder('rope', {
        height: span, diameter: 0.085, tessellation: 7,
      }, scene);
      // -Z is the camera side.
      const near = axis === 'z' && sign === -1;
      rope.material = near ? nearMats[i % nearMats.length]! : m;
      rope.parent = root;
      rope.isPickable = false;
      if (axis === 'x') {
        rope.rotation.x = Math.PI / 2;
        rope.position.set(sign * (H + 0.22), matY + rh, 0);
      } else {
        rope.rotation.z = Math.PI / 2;
        rope.position.set(0, matY + rh, sign * (HZ + 0.22));
      }
      ropes.push(rope);
    }
  });

  // --- steel skirt trim so the apron reads as built, not printed ---
  for (const [axis, sign] of [['x', 1], ['x', -1], ['z', 1], ['z', -1]] as const) {
    const trim = CreateBox('trim', {
      width: axis === 'x' ? 0.08 : outer * 2, height: 0.1, depth: axis === 'x' ? outerZ * 2 : 0.08,
    }, scene);
    trim.position.set(axis === 'x' ? sign * outer : 0, matY - 0.02, axis === 'z' ? sign * outerZ : 0);
    trim.parent = root;
    trim.material = flatMaterial(scene, C.acid, 0.45);
    trim.isPickable = false;
  }

  return { root, ropes, posts, inked };
}

/** Soft blob shadow under a fighter. Cheaper than a shadow map and reads better. */
export function buildBlobShadow(scene: Scene, name: string): Mesh {
  const m = CreateCylinder(name, { height: 0.012, diameter: 1, tessellation: 14 }, scene);
  const mat = new StandardMaterial(`${name}_mat`, scene);
  mat.diffuseColor = new Color3(0, 0, 0);
  mat.emissiveColor = new Color3(0, 0, 0);
  mat.specularColor = new Color3(0, 0, 0);
  mat.alpha = 0.34;
  mat.disableLighting = true;
  m.material = mat;
  m.isPickable = false;
  m.position = new Vector3(0, TUNING.ring.matY + 0.09, 0);
  return m;
}
