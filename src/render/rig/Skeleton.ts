import type { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Skeleton } from '@babylonjs/core/Bones/skeleton';
import { Bone } from '@babylonjs/core/Bones/bone';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
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

/**
 * Mirrors the TransformNode hierarchy as a real Babylon skeleton and links each
 * bone to its node.
 *
 * The rig is posed by writing rotations onto TransformNodes, and every clip in
 * the game addresses them by name, so the nodes stay: props parent to hand
 * bones, the camera reads positions off them, and the whole clip library is
 * written against them.
 *
 * Babylon's `linkTransformNode` is meant to make a bone follow a node
 * automatically and it did not work here — `Skeleton.prepare()` left the bone's
 * local rotation at identity however the node was posed. Driving the bones
 * directly does work (verified: rotating a bone visibly bends the skin), so
 * `CharacterRig` copies node to bone itself once a frame, right after the pose
 * is applied. Twenty-six copies per wrestler per frame is nothing next to
 * having a skeleton that actually deforms.
 */
export interface BoneRig {
  skeleton: Skeleton;
  /** Node/bone pairs, in hierarchy order, for the per-frame copy. */
  pairs: [TransformNode, Bone][];
}

export function buildBoneSkeleton(scene: Scene, bones: Bones, name: string): BoneRig {
  const skeleton = new Skeleton(`${name}_skel`, `${name}_skel`, scene);
  const made = new Map<TransformNode, Bone>();

  for (const b of BONES) bones[b].computeWorldMatrix(true);

  for (const b of BONES) {
    const node = bones[b];
    const parentNode = node.parent as TransformNode | null;
    const parentBone = parentNode ? made.get(parentNode) ?? null : null;
    /*
     * A bone's rest matrix is LOCAL to its parent, not world. Handing it the
     * world matrix makes every bone carry its ancestors' transforms a second
     * time, which folds the whole figure in on itself.
     */
    const local = parentBone && parentNode
      ? node.getWorldMatrix().multiply(Matrix.Invert(parentNode.getWorldMatrix()))
      : node.getWorldMatrix().clone();
    const bone = new Bone(`${name}_${b}`, skeleton, parentBone, local);
    made.set(node, bone);
  }
  skeleton.returnToRest();
  const pairs: [TransformNode, Bone][] = BONES.map((b) => [bones[b], made.get(bones[b])!]);
  return { skeleton, pairs };
}

/* ------------------------------------------------------------------ *
 * geometry helpers
 * ------------------------------------------------------------------ */

/**
 * How far from a joint the skin blends between a bone and its parent, in ring
 * units. Wide enough that an elbow rounds instead of creasing to a point,
 * narrow enough that a forearm does not drag the upper arm with it.
 */
const JOINT_BLEND = 0.06;

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

  /*
   * Eight segments, not ten. Two wrestlers are two thirds of the scene's whole
   * vertex budget, and at match distance a body part is twenty to sixty pixels
   * across with a cel band and an ink line over it — there is no angle at which
   * the extra ring of a ten-segment sphere is visible, and the anatomy pass
   * added enough of them for it to matter.
   */
  sphere(bone: TransformNode, hex: string, d: number, o?: PartOpts, seg = 8): void {
    this.push(bone, CreateSphere(`${this.name}_s`, { diameter: d, segments: seg }, this.scene), hex, o);
  }

  cyl(
    bone: TransformNode, hex: string, h: number, dTop: number, dBottom: number, o?: PartOpts,
    tess = 8,
  ): void {
    this.push(bone, CreateCylinder(
      `${this.name}_c`, { height: h, diameterTop: dTop, diameterBottom: dBottom, tessellation: tess },
      this.scene,
    ), hex, o);
  }

  /**
   * Tapered limb segment running down -Y from the joint, with a ball at the
   * joint itself and an optional muscle belly along it.
   *
   * The joint ball predates skinning, where a bent elbow opened a visible wedge
   * between two tube ends. Skinning closes that wedge, but the ball still
   * rounds the joint's silhouette and costs nothing, so it stays.
   *
   * `belly` is what stops a limb reading as a pipe. The camera looks along Z at
   * a wrestler who faces X, so the visible outline of an arm is its
   * FRONT-TO-BACK profile — which means a bicep has to bulge forward and a calf
   * backward to be seen at all. `belly.push` is that offset, signed along X;
   * `belly.at` is how far down the segment it sits, 0 at the joint.
   */
  limb(
    bone: TransformNode, hex: string, len: number, top: number, bottom: number,
    belly?: { at: number; size: number; push: number },
  ): void {
    this.sphere(bone, hex, top * 1.02, undefined, 8);
    this.cyl(bone, hex, len, top, bottom, { pos: [0, -len / 2, 0] });
    if (belly) {
      this.sphere(bone, hex, top * belly.size, {
        pos: [belly.push * top, -len * belly.at, 0],
        scale: [1.0, 1.35, 0.86],
      }, 8);
    }
  }

  /**
   * Merges everything into ONE skinned mesh.
   *
   * It used to merge per bone and parent each chunk to its TransformNode, which
   * meant a limb was a rigid tube pivoting at a hard point: an elbow could not
   * bend, it could only hinge, and no amount of extra geometry fixes that. Now
   * every primitive is baked into the rig's own space and carries skin weights,
   * so the mesh deforms with the skeleton and joints actually bend.
   *
   * Each vertex is weighted to the bone whose bucket it came from, blended
   * toward that bone's PARENT across a short zone around the joint. The bucket
   * already tells us which bone a vertex belongs to, and the vertex's local Y
   * tells us how close to the joint it sits, so the weights fall out of the
   * existing structure without an authored skin.
   *
   * It also collapses ~20 draw calls per wrestler to one, which matters twice
   * over: the ink outline redraws every mesh, so it goes from 20 extra draws
   * per wrestler to one.
   */
  finish(rootBone: TransformNode, skeleton: Skeleton): Mesh[] {
    const mat = new StandardMaterial(`${this.name}_mat`, this.scene);
    mat.diffuseColor = new Color3(1, 1, 1);
    /*
     * A real highlight, and much less self-light. At 0.34 emissive a third of
     * every pixel on a body was flat unlit colour, so an arm and the torso
     * behind it were the same brightness and the figure read as a cut-out.
     */
    mat.specularColor = new Color3(0.30, 0.30, 0.34);
    mat.specularPower = 26;
    mat.emissiveColor = new Color3(0.13, 0.13, 0.15);

    const boneIndex = new Map<string, number>();
    skeleton.bones.forEach((b, i) => boneIndex.set(b.name, i));

    rootBone.computeWorldMatrix(true);
    const toRig = Matrix.Invert(rootBone.getWorldMatrix());

    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const mIdx: number[] = [];
    const mWt: number[] = [];

    for (const [bone, list] of this.buckets) {
      const merged = list.length === 1
        ? list[0]!
        : Mesh.MergeMeshes(list, true, true, undefined, false, false);
      if (!merged) continue;

      const pos = merged.getVerticesData(VertexBuffer.PositionKind);
      const nrm = merged.getVerticesData(VertexBuffer.NormalKind);
      const col = merged.getVerticesData(VertexBuffer.ColorKind);
      const idx = merged.getIndices();
      if (!pos || !idx) { merged.dispose(); continue; }

      const self = boneIndex.get(bone.name) ?? 0;
      const parentNode = bone.parent as TransformNode | null;
      const parent = parentNode ? boneIndex.get(parentNode.name) ?? self : self;

      bone.computeWorldMatrix(true);
      const toLocalRig = bone.getWorldMatrix().multiply(toRig);
      const rot = toLocalRig.getRotationMatrix();

      const base = positions.length / 3;
      for (let v = 0; v < pos.length; v += 3) {
        const local = new Vector3(pos[v]!, pos[v + 1]!, pos[v + 2]!);
        const world = Vector3.TransformCoordinates(local, toLocalRig);
        positions.push(world.x, world.y, world.z);

        if (nrm) {
          const n = Vector3.TransformNormal(
            new Vector3(nrm[v]!, nrm[v + 1]!, nrm[v + 2]!), rot,
          ).normalize();
          normals.push(n.x, n.y, n.z);
        }

        /*
         * Local Y is distance from the joint: a bone's geometry hangs from 0
         * down to -len, and the joint itself sits at 0. Only vertices actually
         * NEAR that plane share with the parent, and never more than a third.
         *
         * Weighting by sign instead — everything at or above the joint going
         * half to the parent — put 96% of the body in the blend zone, which
         * makes a torso slosh when a neck turns. Distance from the joint, hard
         * cut-off, is what wants to happen here.
         */
        const dist = Math.abs(local.y);
        const toParent = dist < JOINT_BLEND
          ? 0.34 * (1 - dist / JOINT_BLEND)
          : 0;
        mIdx.push(self, parent, 0, 0);
        mWt.push(1 - toParent, toParent, 0, 0);
      }
      if (col) for (const c of col) colors.push(c);
      for (const i of idx) indices.push(base + i);
      merged.dispose();
    }

    const mesh = new Mesh(`${this.name}_body`, this.scene);
    const data = new VertexData();
    data.positions = positions;
    data.indices = indices;
    if (normals.length) data.normals = normals;
    if (colors.length === (positions.length / 3) * 4) data.colors = colors;
    data.matricesIndices = mIdx;
    data.matricesWeights = mWt;
    data.applyToMesh(mesh);

    mesh.material = mat;
    mesh.useVertexColors = colors.length > 0;
    mesh.skeleton = skeleton;
    mesh.parent = rootBone.parent as TransformNode;
    mesh.isPickable = false;
    mesh.alwaysSelectAsActiveMesh = true;
    return [mesh];
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
