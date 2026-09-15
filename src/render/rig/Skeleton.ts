import type { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';

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

export type Bones = Record<BoneName, TransformNode>;

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

export interface RigPalette {
  skin: string;
  skinShade: string;
  hair: string;
  hairLo: string;
  main: string;
  alt: string;
  accent: string;
  trim: string;
  boot: string;
  eye: string;
}

export interface RigSpec {
  proportions: Proportions;
  palette: RigPalette;
  head: {
    kind: 'glam' | 'insect';
    /** Hair shape. A bouffant is wider and taller than the skull. */
    wig?: 'bob' | 'bouffant' | 'none';
    /** Insect head extras. */
    mandibles?: boolean;
    antennae?: boolean;
    compoundEyes?: boolean;
    /** Glam head extras. */
    lashes?: boolean;
    lips?: boolean;
  };
  costume: {
    top: 'leotard' | 'harness';
    puffSleeves?: boolean;
    gloves?: boolean;
    collar?: boolean;
    trunks?: boolean;
    scalePanels?: boolean;
    beltBuckle?: boolean;
    /** A shirt collar with a tie hanging down the chest. */
    tie?: boolean;
    /** Full-length sleeves in the accent colour, not just a shoulder puff. */
    longSleeves?: boolean;
    /** A device painted across the back. RAID's lightning bolt. */
    backEmblem?: 'bolt' | 'none';
  };
  extras: {
    /** Pairs of additional arms, hung off the chest. RAID uses 2. */
    extraArmPairs?: number;
    /** Hip prop: Jassy's brick phone. Shape is deliberately generic. */
    hipProp?: 'brickphone' | 'canister' | 'none';
    shoulderPads?: boolean;
  };
}

/** Cached materials, one per colour per scene, so parts share draw state. */
const matCache = new WeakMap<Scene, Map<string, StandardMaterial>>();

export function flatMaterial(scene: Scene, hex: string, emissive = 0.22): StandardMaterial {
  let map = matCache.get(scene);
  if (!map) { map = new Map(); matCache.set(scene, map); }
  const key = `${hex}|${emissive}`;
  const hit = map.get(key);
  if (hit) return hit;
  const m = new StandardMaterial(`m_${key}`, scene);
  const c = Color3.FromHexString(hex);
  m.diffuseColor = c;
  m.specularColor = new Color3(0.08, 0.08, 0.1);
  m.emissiveColor = c.scale(emissive);
  m.backFaceCulling = true;
  m.freeze();
  map.set(key, m);
  return m;
}

/* ------------------------------------------------------------------ *
 * skeleton
 * ------------------------------------------------------------------ */

/**
 * Builds the bone hierarchy. Every bone sits at its joint with its child offset
 * already applied, so a clip only has to write rotations.
 */
export function buildSkeleton(scene: Scene, p: Proportions, name: string): Bones {
  const node = (n: string, parent: TransformNode | null, pos: Vector3): TransformNode => {
    const t = new TransformNode(`${name}_${n}`, scene);
    if (parent) t.parent = parent;
    t.position.copyFrom(pos);
    return t;
  };

  const root = node('root', null, Vector3.Zero());
  const hipY = p.heel + p.legLen;
  const hips = node('hips', root, new Vector3(0, hipY, 0));
  const spine = node('spine', hips, new Vector3(0, p.torsoLen * 0.34, 0));
  const chest = node('chest', spine, new Vector3(0, p.torsoLen * 0.46, 0));
  const neck = node('neck', chest, new Vector3(0, p.torsoLen * 0.2, 0));
  const head = node('head', neck, new Vector3(0, p.neckLen, 0));

  const armY = p.torsoLen * 0.16;
  const mk = (side: 1 | -1, s: 'L' | 'R'): void => {
    const sh = node(`shoulder${s}`, chest, new Vector3(0, armY, side * p.shoulderW * 0.5));
    const ua = node(`upperArm${s}`, sh, new Vector3(0, 0, side * p.shoulderW * 0.14));
    const fa = node(`forearm${s}`, ua, new Vector3(0, -p.armLen * 0.48, 0));
    node(`hand${s}`, fa, new Vector3(0, -p.armLen * 0.44, 0));
    const th = node(`thigh${s}`, hips, new Vector3(0, 0, side * p.hipW * 0.34));
    const sn = node(`shin${s}`, th, new Vector3(0, -p.legLen * 0.48, 0));
    node(`foot${s}`, sn, new Vector3(0, -p.legLen * 0.46, 0));
    void ua; void fa; void sn;
  };
  mk(1, 'L');
  mk(-1, 'R');

  // optional limbs: created always so clips can address them, hidden if unused
  node('midArmL', chest, new Vector3(0.04, -p.torsoLen * 0.06, p.shoulderW * 0.42));
  node('midArmR', chest, new Vector3(0.04, -p.torsoLen * 0.06, -p.shoulderW * 0.42));
  node('lowArmL', spine, new Vector3(0.02, -p.torsoLen * 0.1, p.shoulderW * 0.36));
  node('lowArmR', spine, new Vector3(0.02, -p.torsoLen * 0.1, -p.shoulderW * 0.36));
  node('antennaL', head, new Vector3(0, p.headR * 0.7, p.headR * 0.36));
  node('antennaR', head, new Vector3(0, p.headR * 0.7, -p.headR * 0.36));

  const bones = {} as Bones;
  for (const b of BONES) {
    const found = scene.getTransformNodeByName(`${name}_${b}`);
    if (!found) throw new Error(`skeleton ${name}: missing bone ${b}`);
    bones[b] = found;
  }
  // Neutral pose: arms down, slight hunch on the spine.
  bones.spine.rotation.z = p.hunch;
  return bones;
}

/* ------------------------------------------------------------------ *
 * geometry helpers
 * ------------------------------------------------------------------ */

export interface PartOpts {
  /** Local offset from the bone. */
  pos?: [number, number, number];
  rot?: [number, number, number];
  /** Uniform or per-axis scale applied after construction. */
  scale?: [number, number, number];
}

/**
 * Accumulates parts per bone and merges each bone's parts into a single mesh
 * with baked vertex colours, so a whole wrestler is ~20 draw calls.
 */
export class BodyBuilder {
  private buckets = new Map<TransformNode, Mesh[]>();
  constructor(private scene: Scene, private name: string) {}

  private push(bone: TransformNode, mesh: Mesh, hex: string, o?: PartOpts): void {
    if (o?.pos) mesh.position.set(o.pos[0], o.pos[1], o.pos[2]);
    if (o?.rot) mesh.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
    if (o?.scale) mesh.scaling.set(o.scale[0], o.scale[1], o.scale[2]);
    mesh.bakeCurrentTransformIntoVertices();
    paintVertices(mesh, hex);
    const list = this.buckets.get(bone) ?? [];
    list.push(mesh);
    this.buckets.set(bone, list);
  }

  box(bone: TransformNode, hex: string, w: number, h: number, d: number, o?: PartOpts): void {
    this.push(bone, CreateBox(`${this.name}_b`, { width: w, height: h, depth: d }, this.scene), hex, o);
  }

  sphere(bone: TransformNode, hex: string, d: number, o?: PartOpts, seg = 10): void {
    this.push(bone, CreateSphere(`${this.name}_s`, { diameter: d, segments: seg }, this.scene), hex, o);
  }

  cyl(
    bone: TransformNode, hex: string, h: number, dTop: number, dBottom: number, o?: PartOpts,
  ): void {
    this.push(bone, CreateCylinder(
      `${this.name}_c`, { height: h, diameterTop: dTop, diameterBottom: dBottom, tessellation: 10 },
      this.scene,
    ), hex, o);
  }

  /**
   * Tapered limb segment running down -Y from the joint, with a ball at the
   * joint itself.
   *
   * The rig is rigid, not skinned: each bone owns one merged chunk of geometry
   * and pivots at a hard point. Without the ball, a bent elbow or knee opened a
   * visible wedge of empty space between two tube ends, which is most of what
   * made the wrestlers read as loose action figures. A sphere the width of the
   * tube fills that wedge at every angle, for one extra primitive that merges
   * into the same draw call.
   */
  limb(bone: TransformNode, hex: string, len: number, top: number, bottom: number): void {
    this.sphere(bone, hex, top * 1.02, undefined, 8);
    this.cyl(bone, hex, len, top, bottom, { pos: [0, -len / 2, 0] });
  }

  /** Merges each bucket, parents the result to its bone, returns the meshes. */
  finish(): Mesh[] {
    const out: Mesh[] = [];
    const mat = new StandardMaterial(`${this.name}_mat`, this.scene);
    mat.diffuseColor = new Color3(1, 1, 1);
    /*
     * A real highlight, and much less self-light.
     *
     * At 0.34 emissive, a third of every pixel on a body was flat unlit colour,
     * so an arm and the torso behind it were the same brightness and the whole
     * figure read as a paper cut-out. Dropping it to 0.13 lets the key and rim
     * lights actually shade a limb; the specular gives the highlight that tells
     * you a shoulder is round. The floor is still high enough that a near-black
     * costume does not disappear on a dim stage.
     */
    mat.specularColor = new Color3(0.30, 0.30, 0.34);
    mat.specularPower = 26;
    mat.emissiveColor = new Color3(0.13, 0.13, 0.15);
    for (const [bone, list] of this.buckets) {
      const merged = list.length === 1
        ? list[0]!
        : Mesh.MergeMeshes(list, true, true, undefined, false, false);
      if (!merged) continue;
      merged.name = `${this.name}_${bone.name}_body`;
      merged.material = mat;
      merged.useVertexColors = true;
      merged.parent = bone;
      merged.isPickable = false;
      merged.alwaysSelectAsActiveMesh = true;
      out.push(merged);
    }
    return out;
  }
}

function paintVertices(mesh: Mesh, hex: string): void {
  const c = Color3.FromHexString(hex);
  const n = mesh.getTotalVertices();
  const colors = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    colors[i * 4] = c.r;
    colors[i * 4 + 1] = c.g;
    colors[i * 4 + 2] = c.b;
    colors[i * 4 + 3] = 1;
  }
  mesh.setVerticesData(VertexBuffer.ColorKind, colors, false);
}
