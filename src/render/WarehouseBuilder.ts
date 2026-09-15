import type { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
// Side-effect import: createInstance() is patched onto Mesh by this module, so
// a type-only import is erased and the call fails at runtime.
import '@babylonjs/core/Meshes/instancedMesh';
import type { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { ArenaConfig } from '@/game/arenas/types';
import { TUNING } from '@/game/config/tuning';
import { flatMaterial } from './rig/Skeleton';
import { bannerTexture, emissiveMat, flyerTexture, signTexture } from './textures';
import { C } from '@/game/config/canon';
import { Rng } from '@/game/util/rng';

export interface Lamp {
  mesh: Mesh;
  cone: Mesh;
  /** Colour and intensity to return to when the rig is behaving. */
  color: Color3;
  intensity: number;
}

interface Sign {
  node: TransformNode;
  baseY: number;
  phase: number;
}

export interface Warehouse {
  root: TransformNode;
  crowd: CrowdMember[];
  /** Practical lamps, dimmed and strobed by the BAD WIRING spectacle. */
  lamps: Lamp[];
  update(dt: number, heat01: number, spectacle: boolean): void;
  /**
   * The rig reacting to a theatrical spot: everything drops except one colour,
   * which is the cheapest possible way to make a finisher feel like the room
   * changed rather than the animation got bigger.
   */
  spotlight(accent: string, ms: number): void;
}

interface CrowdMember {
  node: InstancedMesh;
  baseY: number;
  baseRX: number;
  baseRZ: number;
  angle: number;
  phase: number;
}

/**
 * The 2018 origin room as a stylised composite: concrete, scaffold, taped-up
 * flyers, cheap gels, and an audience standing close enough to touch the apron.
 * No real address or floor plan is implied (Bible s18.1).
 */
export function buildWarehouse(scene: Scene, arena: ArenaConfig): Warehouse {
  const root = new TransformNode('warehouse', scene);
  const rng = new Rng(0xc40c3a17);
  const H = TUNING.ring.half;
  const HZ = TUNING.ring.halfZ;

  // --- floor ---
  const floor = CreateBox('floor', { width: 40, height: 0.4, depth: 40 }, scene);
  floor.position.y = -0.2;
  floor.parent = root;
  floor.material = flatMaterial(scene, '#1A1220', 0.1);
  floor.isPickable = false;

  // --- walls ---
  const wallMat = flatMaterial(scene, '#241733', 0.08);
  const wallH = 8;
  for (const [ax, sgn] of [['x', 1], ['x', -1], ['z', 1], ['z', -1]] as const) {
    const w = CreateBox('wall', {
      width: ax === 'x' ? 0.6 : 34, height: wallH, depth: ax === 'x' ? 34 : 0.6,
    }, scene);
    w.position.set(ax === 'x' ? sgn * 15 : 0, wallH / 2, ax === 'z' ? sgn * 15 : 0);
    w.parent = root;
    w.material = wallMat;
    w.isPickable = false;
    w.freezeWorldMatrix();
  }

  /*
   * The painted banner.
   *
   * It used to hang at z = -14.6 with a comment claiming that was the far wall
   * behind the crowd. The camera sits at NEGATIVE z (see DirectorCamera: pos.z
   * = look.z - cos(yaw) * dist), so -14.6 is the wall BEHIND THE LENS and the
   * biggest painted surface in the building was never once on screen.
   *
   * The far wall is +z, and a Babylon plane's normal points -Z, so at +14.6 it
   * already faces the camera and must NOT be turned round. The flyers are the
   * proof: they sit at x = +-14.55 with rotation.y = +-PI/2 and face inward.
   */
  /*
   * Hung on a scaffold behind the crowd rather than painted on the wall. The
   * wall is fifteen units out, which at this camera's downward tilt puts its
   * mid-height essentially on the horizon — anything readable up there lands
   * behind the HUD. Bringing it in to ten drops it into the band between the
   * health bars and the back row, where it can actually be read.
   */
  const banner = CreatePlane('banner', { width: 9, height: 3.2 }, scene);
  banner.position.set(0, 1.7, 10.0);
  banner.parent = root;
  banner.material = emissiveMat(scene, 'bannerMat', bannerTexture(scene), 0.4);
  banner.isPickable = false;
  banner.freezeWorldMatrix();

  for (const sx of [-1, 1]) {
    const mast = CreateBox('bannerMast', { width: 0.12, height: 3.9, depth: 0.12 }, scene);
    mast.position.set(sx * 4.6, 1.95, 10.05);
    mast.parent = root;
    mast.material = flatMaterial(scene, '#3A2B45', 0.06);
    mast.isPickable = false;
    mast.freezeWorldMatrix();
  }

  // taped-up flyers
  for (let i = 0; i < 10; i++) {
    const f = CreatePlane('flyer', { width: 0.9, height: 0.9 }, scene);
    const side = i % 2 === 0 ? 1 : -1;
    f.position.set(side * 14.55, 1.6 + rng.range(0, 3.4), rng.range(-11, 11));
    f.rotation.y = side * Math.PI / 2;
    f.rotation.z = rng.range(-0.12, 0.12);
    f.parent = root;
    f.material = emissiveMat(scene, `flyerMat${i}`, flyerTexture(scene, i), 0.55);
    f.isPickable = false;
    f.freezeWorldMatrix();
  }

  // --- scaffold and roof beams ---
  const steel = flatMaterial(scene, '#3A2B45', 0.06);
  for (let i = -2; i <= 2; i++) {
    // Nothing overhead on the camera side. The shot looks down over the ring,
    // so a roof beam in front of the lens hangs straight across the match.
    if (i * 5.2 < -1) continue;
    const beam = CreateBox('beam', { width: 30, height: 0.34, depth: 0.34 }, scene);
    beam.position.set(0, 7.0, i * 5.2);
    beam.parent = root;
    beam.material = steel;
    beam.isPickable = false;
    beam.freezeWorldMatrix();
  }
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
    const col = CreateBox('column', { width: 0.5, height: 8, depth: 0.5 }, scene);
    col.position.set(sx * 9.5, 4, sz * 9.5);
    col.parent = root;
    col.material = steel;
    col.isPickable = false;
    col.freezeWorldMatrix();
  }

  // --- lamps: emissive cans with visible cheap gel cones ---
  const lamps: Lamp[] = [];
  arena.lighting.rig.forEach((r, i) => {
    const a = (i / arena.lighting.rig.length) * Math.PI * 2 + 0.7;
    const x = Math.cos(a) * 5.4;
    const z = Math.sin(a) * 5.4;
    // Same for the lighting rig: a lamp hung on the camera side of the ring
    // sits in the middle of the picture at this angle.
    if (z < -1.2) return;

    const can = CreateCylinder('lampCan', {
      height: 0.4, diameterTop: 0.36, diameterBottom: 0.5, tessellation: 8,
    }, scene);
    can.position.set(x, 5.5, z);
    can.parent = root;
    const m = new StandardMaterial(`lamp${i}`, scene);
    const col = Color3.FromHexString(r.color);
    m.diffuseColor = col.scale(0.5);
    m.emissiveColor = col.scale(r.intensity);
    m.specularColor = new Color3(0, 0, 0);
    can.material = m;
    can.isPickable = false;

    const cone = CreateCylinder('lampCone', {
      height: 5.0, diameterTop: 0.5, diameterBottom: 4.6, tessellation: 12,
    }, scene);
    cone.position.set(x * 0.55, 3.0, z * 0.55);
    cone.parent = root;
    const cm = new StandardMaterial(`cone${i}`, scene);
    cm.diffuseColor = new Color3(0, 0, 0);
    cm.emissiveColor = col.scale(0.5);
    cm.specularColor = new Color3(0, 0, 0);
    cm.alpha = 0.085;
    cm.disableLighting = true;
    cm.backFaceCulling = false;
    cone.material = cm;
    cone.isPickable = false;

    // hanging cable
    const cable = CreateCylinder('cable', { height: 1.6, diameter: 0.03, tessellation: 4 }, scene);
    cable.position.set(x, 6.5, z);
    cable.parent = root;
    cable.material = steel;
    cable.isPickable = false;

    lamps.push({ mesh: can, cone, color: col, intensity: r.intensity });
  });

  /*
   * --- barricade ---
   *
   * A guardrail between the ringside floor and the front row. It is the single
   * cheapest thing that says "arena" rather than "ring in a room": a hard
   * horizontal line at knee height running all the way round behind the ropes,
   * with the crowd stacked behind it.
   *
   * It sits just outside RING.floorHalf, which is as far out as a wrestler
   * thrown over the top rope can get — so being flung into the barricade puts
   * them against it, not through it.
   */
  // Ringside is the darkest part of the room, so the rail carries its own
  // value or it is a black shape in front of black shapes.
  const railSteel = flatMaterial(scene, '#8A7499', 0.24);
  const panelParts: Mesh[] = [];
  for (const y of [0.92, 0.54]) {
    const rail = CreateBox('rail', { width: 1.2, height: 0.075, depth: 0.07 }, scene);
    rail.position.y = y;
    panelParts.push(rail);
  }
  for (const x of [-0.56, 0.56]) {
    const post = CreateBox('post', { width: 0.07, height: 0.98, depth: 0.07 }, scene);
    post.position.set(x, 0.49, 0);
    panelParts.push(post);
  }
  const panelSrc = Mesh.MergeMeshes(panelParts, true, true)!;
  panelSrc.name = 'barricadeSrc';
  panelSrc.material = railSteel;
  panelSrc.isPickable = false;
  panelSrc.setEnabled(false);
  panelSrc.parent = root;

  const barR = { x: H + 1.34, z: HZ + 1.34 };
  const PANELS = 34;
  for (let i = 0; i < PANELS; i++) {
    const angle = (i / PANELS) * Math.PI * 2;
    // Same rule as the crowd: nothing between the lens and the ropes.
    if (Math.sin(angle) < -0.2) continue;
    const inst = panelSrc.createInstance(`barricade_${i}`);
    inst.position.set(Math.cos(angle) * barR.x, 0, Math.sin(angle) * barR.z);
    // An ellipse's outward normal is not its radius, so face each panel along
    // the true tangent or the corners splay open.
    inst.rotation.y = -Math.atan2(Math.cos(angle) * barR.z, -Math.sin(angle) * barR.x) + Math.PI / 2;
    inst.parent = root;
    inst.isPickable = false;
    inst.freezeWorldMatrix();
  }
  // A lit top rail, so the barricade reads as a line rather than as clutter.
  for (const [rx, rz, seg] of [[barR.x, barR.z, 40]] as const) {
    for (let i = 0; i < seg; i++) {
      const angle = (i / seg) * Math.PI * 2;
      if (Math.sin(angle) < -0.2) continue;
      // Long enough to close the gap to the next segment: short caps read as a
      // dashed line, and the whole point of the rail is that it is one line.
      const cap = CreateBox('railCap', { width: 0.78, height: 0.04, depth: 0.09 }, scene);
      cap.position.set(Math.cos(angle) * rx, 0.965, Math.sin(angle) * rz);
      cap.rotation.y = -angle + Math.PI / 2;
      cap.parent = root;
      cap.material = flatMaterial(scene, C.acid, 0.85);
      cap.isPickable = false;
      cap.freezeWorldMatrix();
    }
  }

  /*
   * --- crowd signs ---
   *
   * Held up over the front rows, which is the only band of the far side that
   * is not already crowd silhouette or rope. They sway, because a sign nobody
   * is holding is a sign nailed to the air.
   */
  const signs: Sign[] = [];
  for (let i = 0; i < 11; i++) {
    const angle = rng.range(0.28, Math.PI - 0.28);
    const rad = 1.95 + rng.range(0, 1.1);
    const board = CreatePlane('sign', { width: 0.66, height: 0.5 }, scene);
    board.material = emissiveMat(scene, `signMat${i}`, signTexture(scene, i), 0.5);
    const stick = CreateBox('signStick', { width: 0.035, height: 0.42, depth: 0.035 }, scene);
    stick.position.y = -0.44;
    stick.material = flatMaterial(scene, '#5A4636', 0.08);
    const holder = new TransformNode(`signHolder${i}`, scene);
    board.parent = holder;
    stick.parent = holder;
    holder.position.set(Math.cos(angle) * (H + rad), 1.92 + rng.range(0, 0.22), Math.sin(angle) * (HZ + rad));
    board.isPickable = false;
    stick.isPickable = false;
    holder.parent = root;
    signs.push({ node: holder, baseY: holder.position.y, phase: rng.range(0, Math.PI * 2) });
  }

  // --- crowd: instanced silhouettes standing right up against the apron ---
  const crowd: CrowdMember[] = [];
  const sources: Mesh[] = arena.crowd.colors.map((hex, i) => {
    const body = CreateBox(`crowdBody${i}`, { width: 0.34, height: 1.1, depth: 0.28 }, scene);
    body.position.y = 0.55;
    const head = CreateSphere(`crowdHead${i}`, { diameter: 0.3, segments: 6 }, scene);
    head.position.y = 1.24;
    const merged = Mesh.MergeMeshes([body, head], true, true)!;
    merged.name = `crowdSrc${i}`;
    merged.material = flatMaterial(scene, hex, 0.05);
    merged.isPickable = false;
    merged.setEnabled(false);
    merged.parent = root;
    return merged;
  });

  // The audience rings a wide, shallow mat, so the crowd is an ellipse rather
  // than a circle — a circular crowd left big empty gaps off the short sides.
  for (let row = 0; row < arena.crowd.rows; row++) {
    // Behind the barricade, not on top of it. The heat-driven press-in still
    // brings them right up against the rail, which is where a crowd goes.
    const rx = H + 1.66 + row * 0.72;
    const rz = HZ + 1.66 + row * 0.72;
    const count = arena.crowd.density + row * 8;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + rng.range(-0.03, 0.03);
      /*
       * Nobody sits on the camera side. The shot is a broadcast hard camera:
       * side-on, orthographic, and looking across the ring, so anyone placed
       * between the lens and the ropes stands full-size in front of the match.
       * Real hard cameras look over an empty aisle for exactly this reason.
       */
      if (Math.sin(angle) < -0.24) continue;
      const src = sources[Math.floor(rng.next() * sources.length)]!;
      const inst = src.createInstance(`crowd_${row}_${i}`);
      const jitter = rng.range(-0.14, 0.14);
      inst.position.set(Math.cos(angle) * (rx + jitter), 0, Math.sin(angle) * (rz + jitter));
      inst.rotation.y = -angle + Math.PI / 2;
      const scale = rng.range(0.88, 1.14);
      inst.scaling.setAll(scale);
      inst.parent = root;
      inst.isPickable = false;
      crowd.push({ node: inst, baseY: 0, baseRX: rx + jitter, baseRZ: rz + jitter, angle, phase: rng.range(0, Math.PI * 2) });
    }
  }

  let t = 0;
  let flicker = 1;
  let spotMs = 0;
  let spotColor = Color3.FromHexString('#FFFFFF');

  return {
    root, crowd, lamps,
    spotlight(accent: string, ms: number): void {
      spotColor = Color3.FromHexString(accent);
      spotMs = ms;
    },
    update(dt: number, heat01: number, spectacle: boolean): void {
      t += dt / 1000;
      if (spotMs > 0) spotMs -= dt;

      // Crowd bobs harder and creeps toward the ring as the room heats up.
      const bob = 0.02 + heat01 * 0.16;
      const press = heat01 * arena.crowd.pressIn;
      for (let i = 0; i < crowd.length; i++) {
        const c = crowd[i]!;
        const s = Math.sin(t * (3.2 + heat01 * 4.4) + c.phase);
        c.node.position.y = c.baseY + Math.max(0, s) * bob;
        c.node.position.x = Math.cos(c.angle) * (c.baseRX - press);
        c.node.position.z = Math.sin(c.angle) * (c.baseRZ - press);
      }

      // Signs wave, harder as the room heats up.
      for (let i = 0; i < signs.length; i++) {
        const g = signs[i]!;
        const w = 0.1 + heat01 * 0.45;
        g.node.rotation.z = Math.sin(t * (1.6 + heat01 * 3.4) + g.phase) * w;
        g.node.position.y = g.baseY + Math.sin(t * (2.2 + heat01 * 3) + g.phase) * (0.02 + heat01 * 0.1);
      }

      // GAME FICTION: BAD WIRING. The rig browns out and strobes at high heat.
      const target = spectacle
        ? 0.35 + Math.abs(Math.sin(t * 19)) * 0.85 + Math.sin(t * 3.1) * 0.15
        : 1 + heat01 * 0.2;
      flicker += (target - flicker) * Math.min(1, dt / 40);
      const inSpot = spotMs > 0;
      for (const l of lamps) {
        const mat = l.mesh.material as StandardMaterial;
        const cm = l.cone.material as StandardMaterial;
        // During a spot the whole rig goes one colour and burns brighter.
        const col = inSpot ? spotColor : l.color;
        const k = l.intensity * (inSpot ? 2.1 : flicker);
        mat.emissiveColor.set(col.r * k, col.g * k, col.b * k);
        const cone = inSpot ? 1.4 : 0.5 * flicker;
        cm.emissiveColor.set(col.r * cone, col.g * cone, col.b * cone);
        cm.alpha = inSpot ? 0.3 : (0.085 + heat01 * 0.03) * flicker;
      }
    },
  };
}
