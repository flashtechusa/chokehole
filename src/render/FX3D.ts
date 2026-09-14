import type { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { C } from '@/game/config/canon';
import { Rng } from '@/game/util/rng';
import { makeTexture, starburst, halftone, fitText, SLAB } from './textures';

interface Shard {
  mesh: Mesh;
  vx: number; vy: number; vz: number;
  spin: number;
  life: number;
  maxLife: number;
  scale: number;
}

interface Burst {
  mesh: Mesh;
  life: number;
  maxLife: number;
  scale: number;
}

/**
 * Impact effects. Every basic attack needs readable contact (Bible s7), so a hit
 * produces a comic starburst card, a spray of shards and a ring of mat dust —
 * cheap pooled geometry, no particle system.
 */
export class FX3D {
  private root: TransformNode;
  private shards: Shard[] = [];
  private pool: Mesh[] = [];
  private bursts: Burst[] = [];
  private burstPool: Mesh[] = [];
  private rings: Burst[] = [];
  private ringPool: Mesh[] = [];
  private rng = new Rng(0x5eed1234);
  private reduceFlash = false;
  private burstMats = new Map<string, StandardMaterial>();

  constructor(private scene: Scene) {
    this.root = new TransformNode('fx', scene);
  }

  setReduceFlash(v: boolean): void { this.reduceFlash = v; }

  /* ---------------- pools ---------------- */

  private takeShard(): Mesh {
    const m = this.pool.pop();
    if (m) { m.setEnabled(true); return m; }
    const s = CreateBox('shard', { size: 0.1 }, this.scene);
    s.parent = this.root;
    s.isPickable = false;
    const mat = new StandardMaterial('shardMat', this.scene);
    mat.emissiveColor = new Color3(1, 1, 1);
    mat.disableLighting = true;
    s.material = mat;
    return s;
  }

  private takeBurst(): Mesh {
    const m = this.burstPool.pop();
    if (m) { m.setEnabled(true); return m; }
    const p = CreatePlane('burst', { size: 1 }, this.scene);
    p.parent = this.root;
    p.isPickable = false;
    p.billboardMode = Mesh.BILLBOARDMODE_ALL;
    return p;
  }

  private takeRing(): Mesh {
    const m = this.ringPool.pop();
    if (m) { m.setEnabled(true); return m; }
    const r = CreateCylinder('shock', {
      height: 0.02, diameterTop: 1, diameterBottom: 1, tessellation: 18,
    }, this.scene);
    r.parent = this.root;
    r.isPickable = false;
    const mat = new StandardMaterial('shockMat', this.scene);
    mat.emissiveColor = Color3.FromHexString(C.bone);
    mat.disableLighting = true;
    mat.alpha = 0.5;
    r.material = mat;
    return r;
  }

  /** One starburst card per word, cached: the deck's comic-panel language. */
  private burstMaterial(word: string, color: string): StandardMaterial {
    const key = `${word}|${color}`;
    const hit = this.burstMats.get(key);
    if (hit) return hit;
    const tex = makeTexture(this.scene, `burst_${key}`, 256, (g, s) => {
      g.clearRect(0, 0, s, s);
      starburst(g, s / 2, s / 2, s * 0.48, s * 0.3, 12, color, this.rng.next() * 2);
      starburst(g, s / 2, s / 2, s * 0.38, s * 0.24, 12, C.bone, this.rng.next() * 2);
      halftone(g, 0, 0, s, s, color, 9, 2, 0.25);
      if (word) {
        g.save();
        g.translate(s / 2, s / 2);
        g.rotate(-0.1);
        fitText(g, word, 0, 0, s * 0.66, '900', SLAB, C.ink, 90);
        g.restore();
      }
    });
    tex.hasAlpha = true;
    const mat = new StandardMaterial(`burstMat_${key}`, this.scene);
    mat.diffuseTexture = tex;
    mat.emissiveTexture = tex;
    mat.opacityTexture = tex;
    mat.emissiveColor = new Color3(1, 1, 1);
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    this.burstMats.set(key, mat);
    return mat;
  }

  /* ---------------- spawners ---------------- */

  /** A struck body: shards, a comic card and (for heavies) a mat shockwave. */
  hit(
    x: number, y: number, z: number, power: number, color: string, word = '',
  ): void {
    const n = Math.round(5 + power * 9);
    for (let i = 0; i < n; i++) {
      const m = this.takeShard();
      m.position.set(x, y, z);
      const s = this.rng.range(0.5, 1.5) * (0.5 + power);
      m.scaling.setAll(s);
      const mat = m.material as StandardMaterial;
      mat.emissiveColor = Color3.FromHexString(this.rng.next() < 0.5 ? color : C.bone);
      mat.alpha = 1;
      const a = this.rng.next() * Math.PI * 2;
      const up = this.rng.range(1.5, 5) * (0.5 + power);
      const out = this.rng.range(1.4, 4.6) * (0.5 + power);
      this.shards.push({
        mesh: m,
        vx: Math.cos(a) * out, vy: up, vz: Math.sin(a) * out,
        spin: this.rng.range(-14, 14),
        life: 0, maxLife: this.rng.range(260, 560), scale: s,
      });
    }

    if (!this.reduceFlash) {
      const b = this.takeBurst();
      b.position.set(x, y + 0.18, z);
      b.material = this.burstMaterial(word, color);
      const size = 0.9 + power * 1.5;
      b.scaling.setAll(size * 0.4);
      this.bursts.push({ mesh: b, life: 0, maxLife: 320 + power * 220, scale: size });
    }

    if (power > 0.7) {
      const r = this.takeRing();
      r.position.set(x, 1.13, z);
      r.scaling.setAll(0.4);
      (r.material as StandardMaterial).emissiveColor = Color3.FromHexString(color);
      this.rings.push({ mesh: r, life: 0, maxLife: 420, scale: 3.4 + power * 2.2 });
    }
  }

  /** Dust and debris when a body hits the mat. */
  slam(x: number, z: number, power: number): void {
    const r = this.takeRing();
    r.position.set(x, 1.13, z);
    r.scaling.setAll(0.5);
    (r.material as StandardMaterial).emissiveColor = Color3.FromHexString('#E8DCC6');
    this.rings.push({ mesh: r, life: 0, maxLife: 500, scale: 3 + power * 3 });
    this.hit(x, 1.2, z, power * 0.7, '#E8DCC6', '');
  }

  /** Confetti for a victory or a finisher. */
  confetti(x: number, z: number, count = 60): void {
    const colors = [C.pink, C.squelsh, C.acid, C.blue, C.bone];
    for (let i = 0; i < count; i++) {
      const m = this.takeShard();
      m.position.set(x + this.rng.range(-1.6, 1.6), 4.2 + this.rng.range(0, 2), z + this.rng.range(-1.6, 1.6));
      const s = this.rng.range(0.7, 1.6);
      m.scaling.set(s, s * 0.35, s);
      const mat = m.material as StandardMaterial;
      mat.emissiveColor = Color3.FromHexString(this.rng.pick(colors));
      mat.alpha = 1;
      this.shards.push({
        mesh: m,
        vx: this.rng.range(-1.2, 1.2), vy: this.rng.range(-0.4, 1.2), vz: this.rng.range(-1.2, 1.2),
        spin: this.rng.range(-9, 9),
        life: 0, maxLife: this.rng.range(1600, 2600), scale: s,
      });
    }
  }

  /* ---------------- update ---------------- */

  update(dt: number): void {
    const s = dt / 1000;

    for (let i = this.shards.length - 1; i >= 0; i--) {
      const sh = this.shards[i]!;
      sh.life += dt;
      sh.vy -= 14 * s;
      sh.mesh.position.x += sh.vx * s;
      sh.mesh.position.y += sh.vy * s;
      sh.mesh.position.z += sh.vz * s;
      sh.mesh.rotation.x += sh.spin * s;
      sh.mesh.rotation.z += sh.spin * 0.7 * s;
      const f = 1 - sh.life / sh.maxLife;
      (sh.mesh.material as StandardMaterial).alpha = Math.max(0, f);
      if (sh.life >= sh.maxLife || sh.mesh.position.y < -0.5) {
        sh.mesh.setEnabled(false);
        this.pool.push(sh.mesh);
        this.shards.splice(i, 1);
      }
    }

    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i]!;
      b.life += dt;
      const f = b.life / b.maxLife;
      // snap out, then fade: comic panels do not ease in
      const grow = f < 0.18 ? (f / 0.18) : 1 + (f - 0.18) * 0.25;
      b.mesh.scaling.setAll(b.scale * grow);
      const mat = b.mesh.material as StandardMaterial;
      mat.alpha = f < 0.55 ? 1 : Math.max(0, 1 - (f - 0.55) / 0.45);
      if (f >= 1) {
        b.mesh.setEnabled(false);
        this.burstPool.push(b.mesh);
        this.bursts.splice(i, 1);
      }
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i]!;
      r.life += dt;
      const f = r.life / r.maxLife;
      const k = 0.4 + f * r.scale;
      r.mesh.scaling.set(k, 1, k);
      (r.mesh.material as StandardMaterial).alpha = Math.max(0, 0.55 * (1 - f));
      if (f >= 1) {
        r.mesh.setEnabled(false);
        this.ringPool.push(r.mesh);
        this.rings.splice(i, 1);
      }
    }
  }
}
