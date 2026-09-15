import type { Scene } from '@babylonjs/core/scene';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Fighter } from '@/game/combat/Fighter';
import type { MatchSim, SimEvent } from '@/game/combat/MatchSim';
import type { HitReport } from '@/game/combat/CombatResolver';
import type { FighterEvent } from '@/game/combat/Fighter';
import type { PropDef } from '@/game/combat/types';
import { FS } from '@/game/combat/states';
import { TUNING } from '@/game/config/tuning';
import { C } from '@/game/config/canon';
import { CharacterRig } from './rig/CharacterRig';
import { STYLE_BRUTE, STYLE_POISED } from './rig/clips';
import { buildRing, buildBlobShadow, type Ring } from './RingBuilder';
import { buildWarehouse, type Warehouse } from './WarehouseBuilder';
import { PRESETS, type Quality, type Stage } from './Engine';
import { DirectorCamera } from './DirectorCamera';
import { FX3D } from './FX3D';
import { flatMaterial } from './rig/Skeleton';
import { clamp } from '@/game/util/math';
import { hitPower } from '@/game/config/impacts';

interface Side {
  fighter: Fighter;
  rig: CharacterRig;
  shadow: Mesh;
  /** Prop currently in this fighter's hands, parented to a hand bone. */
  heldProp: TransformNode | null;
}

/**
 * Draws a MatchSim. All the state lives in the simulation; this class only
 * decides which clip to run, where to stand and what to spawn, so the game rules
 * stay testable without a renderer (Bible s37).
 */
export class MatchView {
  readonly camera: DirectorCamera;
  readonly fx: FX3D;
  private ring: Ring;
  private warehouse: Warehouse;
  private sides: [Side, Side];
  private can: TransformNode | null = null;
  private groundProp: TransformNode | null = null;
  private spin = 0;
  private ropeShake = 0;
  private cinematicUntil = 0;

  constructor(private scene: Scene, private sim: MatchSim, private stage?: Stage) {
    this.ring = buildRing(scene);
    this.warehouse = buildWarehouse(scene, sim.arena);
    this.camera = new DirectorCamera(scene);
    this.fx = new FX3D(scene);

    this.sides = [
      this.makeSide(sim.p1, STYLE_POISED, 'p1'),
      this.makeSide(sim.p2, STYLE_BRUTE, 'p2'),
    ];
    this.applyQuality(stage?.quality ?? 'HIGH');
    this.camera.setMode('ENTRANCE');
  }

  private makeSide(fighter: Fighter, style: typeof STYLE_POISED, name: string): Side {
    const rig = new CharacterRig(this.scene, fighter.cfg.rig, style, name);
    const shadow = buildBlobShadow(this.scene, `${name}_shadow`);
    // A real cast shadow where the device can afford one; the blob underneath
    // stays either way, because it is the only thing that reads a wrestler's
    // HEIGHT during a top-rope dive.
    this.stage?.addShadowCasters(rig.meshes);
    rig.play('entrance');
    return { fighter, rig, shadow, heldProp: null };
  }

  /**
   * Turns the ink outlines on or off for the current quality tier. Called on
   * construction and again whenever the frame time forces a tier down.
   */
  applyQuality(q: Quality): void {
    const on = PRESETS[q].outline;
    for (const m of this.ring.inked) m.renderOutline = on;
    for (const s of this.sides) for (const m of s.rig.meshes) m.renderOutline = on;
  }

  /**
   * A world point as a fraction of the canvas, for the effects that live in the
   * DOM rather than in the scene. Null when the point is behind the camera.
   *
   * Focus lines that always converge on the middle of the screen are focus
   * lines pointing at nothing; they have to find the hit.
   */
  project(x: number, y: number, z: number): { x: number; y: number } | null {
    const cam = this.scene.activeCamera;
    if (!cam) return null;
    const engine = this.scene.getEngine();
    const w = engine.getRenderWidth();
    const hgt = engine.getRenderHeight();
    const p = Vector3.Project(
      new Vector3(x, y, z),
      Matrix.IdentityReadOnly,
      this.scene.getTransformMatrix(),
      cam.viewport.toGlobal(w, hgt),
    );
    if (p.z < 0 || p.z > 1) return null;
    return { x: p.x / w, y: p.y / hgt };
  }

  setReducedFx(reduceFlash: boolean, reduceShake: boolean): void {
    this.fx.setReduceFlash(reduceFlash);
    this.camera.setReduceShake(reduceShake);
  }

  /* ------------------------------------------------------------------ */

  handleEvents(events: SimEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case 'hit': this.onHit(e.report); break;

        case 'reversal':
          this.camera.punch(0.95);
          this.fx.hit(e.by.x, e.by.y + 0.3, e.by.z, 0.9, e.by.cfg.accent);
          break;

        case 'squelshSpawn': this.spawnCan(e.at.x, e.at.z); break;
        case 'squelshTaken': {
          this.despawnCan();
          const side = this.sideOf(e.who);
          side.rig.setTint(e.who.cfg.squelsh.tint);
          this.fx.hit(e.who.x, e.who.y + 0.5, e.who.z, 0.8, e.who.cfg.squelsh.tint);
          break;
        }

        case 'propSpawn': this.spawnGroundProp(e.at.def, e.at.x, e.at.z); break;
        case 'propTaken': this.attachProp(this.sideOf(e.who), e.def); break;
        case 'propDropped': this.spawnGroundProp(e.at.def, e.at.x, e.at.z); break;

        case 'pinStart':
          this.camera.setMode('PIN', { x: e.defender.x, y: e.defender.y + 0.2, z: e.defender.z });
          break;
        case 'pinEscape':
          if (e.nearFall) {
            // The kickout at two is the biggest moment in the match: snap in
            // tight on it, then hand the familiar angle straight back.
            const d = this.sim.pinned ?? this.sim.p1;
            this.camera.setMode('NEARFALL', { x: d.x, y: d.y, z: d.z });
            this.cinematicUntil = performance.now() + 900;
            this.camera.punch(1.5);
            this.fx.confetti(d.x, d.z, 30);
            this.warehouse.spotlight(C.bone, 900);
          } else {
            this.camera.setMode('PLAY');
            this.camera.punch(0.8);
          }
          break;

        case 'finish': {
          const winner = e.result.playerWon ? this.sim.p1 : this.sim.p2;
          this.camera.setMode('VICTORY', { x: winner.x, y: winner.y + 0.3, z: winner.z });
          this.fx.confetti(winner.x, winner.z, 110);
          break;
        }

        case 'spot':
          this.warehouse.spotlight(e.who.cfg.accent, e.kind === 'finisher' ? 2400 : 1100);
          this.camera.punch(e.kind === 'finisher' ? 1.6 : 0.9);
          break;

        case 'fighter': this.onFighterEvent(e.who, e.event); break;

        case 'phase':
          if (e.phase === 'LIVE' && this.camera.mode === 'ENTRANCE') this.camera.setMode('PLAY');
          break;
      }
    }
  }

  private onHit(r: HitReport): void {
    const power = hitPower(r.move);
    // The starburst stays in the world; the word that goes with it is screen
    // space now (see ComicFx.card), because a wrestler standing in front of a
    // billboard is a wrestler standing in front of the callout.
    this.fx.hit(r.x, r.y, r.z, power, r.attacker.cfg.accent);
    this.camera.punch((r.move.cameraPunch ?? 0.3) + power * 0.6);
    this.ropeShake = Math.max(this.ropeShake, power);
    this.sideOf(r.defender).rig.setFlash(1);

    const now = performance.now();
    if (r.move.kind === 'finisher') {
      // The production going off the rails is the whole point of a finisher.
      this.camera.setMode('FINISHER');
      this.cinematicUntil = now + 2800;
      this.fx.confetti(r.x, r.z, 60);
      this.fx.slam(r.x, r.z, 1.4);
    } else if (r.move.kind === 'signature') {
      this.camera.setMode('SIGNATURE');
      this.cinematicUntil = now + 1200;
    } else if (r.move.kind === 'aerial' || r.move.kind === 'dive') {
      this.camera.setMode('SIGNATURE');
      this.cinematicUntil = now + 950;
      this.fx.slam(r.x, r.z, 1.1);
    }
    if (r.move.knockdown) this.fx.slam(r.defender.x, r.defender.z, power);
  }

  private onFighterEvent(who: Fighter, ev: FighterEvent): void {
    switch (ev.type) {
      case 'getUp':
        this.fx.slam(who.x, who.z, 0.25);
        break;
      case 'rebound':
        this.ropeShake = 1;
        this.fx.slam(who.x, who.z, 0.2);
        break;
      case 'perch':
        this.camera.punch(0.4);
        break;
      case 'landed':
        if (ev.type === 'landed' && ev.hard) this.fx.slam(who.x, who.z, 0.8);
        break;
      case 'propDropped':
      case 'propBroke':
        this.detachProp(this.sideOf(who));
        if (ev.type === 'propBroke') this.fx.hit(who.x, who.y + 0.9, who.z, 1.1, C.acid);
        break;
      case 'leftRing':
        this.camera.punch(0.7);
        break;
    }
  }

  private sideOf(f: Fighter): Side {
    return this.sides[0].fighter === f ? this.sides[0] : this.sides[1];
  }

  /* ------------------------------------------------------------------ *
   * pickups and props
   * ------------------------------------------------------------------ */

  private spawnCan(x: number, z: number): void {
    this.despawnCan();
    const root = new TransformNode('squelshCan', this.scene);
    root.position.set(x, TUNING.ring.matY + TUNING.squelsh.hoverY, z);

    const body = CreateCylinder('canBody', {
      height: 0.42, diameterTop: 0.24, diameterBottom: 0.24, tessellation: 12,
    }, this.scene);
    body.parent = root;
    body.material = flatMaterial(this.scene, C.squelsh, 0.85);
    body.isPickable = false;

    const lid = CreateCylinder('canLid', {
      height: 0.06, diameterTop: 0.26, diameterBottom: 0.26, tessellation: 12,
    }, this.scene);
    lid.position.y = 0.23;
    lid.parent = root;
    lid.material = flatMaterial(this.scene, C.acid, 0.9);
    lid.isPickable = false;

    root.addChild(this.halo(x, z, C.squelsh, 1.3));
    this.can = root;
  }

  private despawnCan(): void {
    this.can?.dispose(false, true);
    this.can = null;
  }

  private halo(x: number, z: number, color: string, size: number): Mesh {
    const halo = CreateCylinder('halo', {
      height: 0.01, diameterTop: size, diameterBottom: size, tessellation: 20,
    }, this.scene);
    const hm = new StandardMaterial('haloMat', this.scene);
    hm.emissiveColor = Color3.FromHexString(color);
    hm.disableLighting = true;
    hm.alpha = 0.32;
    halo.material = hm;
    halo.isPickable = false;
    halo.position.set(x, 0, z);
    return halo;
  }

  /** Geometry for an oversized prop, built from its shape hint. */
  private buildProp(def: PropDef): TransformNode {
    const root = new TransformNode(`prop_${def.id}`, this.scene);
    const s = def.scale;
    const main = flatMaterial(this.scene, def.color, 0.5);
    const trim = flatMaterial(this.scene, def.color2, 0.5);

    if (def.shape === 'can') {
      const body = CreateCylinder('p', {
        height: 0.36 * s, diameterTop: 0.2 * s, diameterBottom: 0.2 * s, tessellation: 12,
      }, this.scene);
      body.material = main; body.parent = root; body.isPickable = false;
      const lid = CreateCylinder('p', {
        height: 0.05 * s, diameterTop: 0.22 * s, diameterBottom: 0.22 * s, tessellation: 12,
      }, this.scene);
      lid.position.y = 0.2 * s;
      lid.material = trim; lid.parent = root; lid.isPickable = false;
    } else if (def.shape === 'phone') {
      const body = CreateBox('p', { width: 0.1 * s, height: 0.4 * s, depth: 0.18 * s }, this.scene);
      body.material = main; body.parent = root; body.isPickable = false;
      const ant = CreateCylinder('p', {
        height: 0.22 * s, diameterTop: 0.02 * s, diameterBottom: 0.03 * s, tessellation: 6,
      }, this.scene);
      ant.position.set(0, 0.3 * s, 0.05 * s);
      ant.material = trim; ant.parent = root; ant.isPickable = false;
    } else if (def.shape === 'sign') {
      const board = CreateBox('p', { width: 0.04 * s, height: 0.34 * s, depth: 0.5 * s }, this.scene);
      board.position.y = 0.26 * s;
      board.material = main; board.parent = root; board.isPickable = false;
      const stick = CreateBox('p', { width: 0.04 * s, height: 0.32 * s, depth: 0.05 * s }, this.scene);
      stick.material = trim; stick.parent = root; stick.isPickable = false;
    } else {
      const pipe = CreateCylinder('p', {
        height: 0.8 * s, diameterTop: 0.055 * s, diameterBottom: 0.055 * s, tessellation: 8,
      }, this.scene);
      pipe.material = main; pipe.parent = root; pipe.isPickable = false;
    }
    return root;
  }

  private spawnGroundProp(def: PropDef, x: number, z: number): void {
    this.groundProp?.dispose(false, true);
    const root = this.buildProp(def);
    const y = Math.abs(x) <= TUNING.ring.half && Math.abs(z) <= TUNING.ring.half
      ? TUNING.ring.matY : 0;
    root.position.set(x, y + 0.3, z);
    root.rotation.z = Math.PI / 2.2;
    root.addChild(this.halo(0, 0, def.color, 1.5));
    this.groundProp = root;
  }

  private attachProp(side: Side, def: PropDef): void {
    this.groundProp?.dispose(false, true);
    this.groundProp = null;
    this.detachProp(side);
    const held = this.buildProp(def);
    held.parent = side.rig.bones.handR;
    held.position.set(0.05, -0.16, 0);
    held.rotation.set(0, 0, -0.4);
    side.heldProp = held;
  }

  private detachProp(side: Side): void {
    side.heldProp?.dispose(false, true);
    side.heldProp = null;
  }

  /* ------------------------------------------------------------------ */

  update(dt: number): void {
    const heat01 = this.sim.heat.frac;
    const spectacle = heat01 > 0.66;

    for (const side of this.sides) this.updateSide(side, dt);

    // Cinematic camera modes release themselves rather than relying on timers
    // scheduled from event handlers.
    if (this.cinematicUntil > 0 && performance.now() > this.cinematicUntil) {
      this.cinematicUntil = 0;
      const m = this.camera.mode;
      if (m === 'SIGNATURE' || m === 'FINISHER' || m === 'NEARFALL') {
        this.camera.setMode('PLAY');
      }
    }

    this.ropeShake = Math.max(0, this.ropeShake - dt / 320);
    if (this.ropeShake > 0) {
      const k = this.ropeShake;
      const t = performance.now() / 40;
      for (let i = 0; i < this.ring.ropes.length; i++) {
        const r = this.ring.ropes[i]!;
        const base = TUNING.ring.matY + TUNING.ring.ropeHeights[Math.floor(i / 4)]!;
        r.position.y = base + Math.sin(t + i) * 0.04 * k;
      }
    }

    this.spin += dt / 1000;
    if (this.can) {
      this.can.rotation.y = this.spin * 2.4;
      this.can.position.y = TUNING.ring.matY + TUNING.squelsh.hoverY
        + Math.sin(this.spin * 3.1) * 0.07;
    }
    if (this.groundProp) {
      this.groundProp.rotation.y = this.spin * 1.2;
    }

    this.warehouse.update(dt, heat01, spectacle);
    this.fx.update(dt);

    const a = this.sim.p1;
    const b = this.sim.p2;
    // `outside` was never passed, so the camera never widened for a fight that
    // spilled onto the floor and the outside fighter's feet fell out of frame.
    this.camera.update(
      dt,
      { x: a.x, y: a.y, z: a.z },
      { x: b.x, y: b.y, z: b.z },
      a.outside || b.outside,
    );
  }

  private updateSide(side: Side, dt: number): void {
    const f = side.fighter;
    const rig = side.rig;

    rig.root.position.set(f.x, f.y + 0.08, f.z);
    // Babylon yaw is clockwise from +Z; the sim's facing is measured from +X.
    rig.root.rotation.y = -f.facing + Math.PI / 2;

    const gy = f.groundY;
    side.shadow.position.set(f.x, gy + 0.02, f.z);
    const air = Math.max(0, f.y - gy);
    const shrink = clamp(1 - air * 0.22, 0.3, 1);
    const size = f.cfg.stats.radius * 2.1 * shrink;
    side.shadow.scaling.set(size, 1, size);
    (side.shadow.material as StandardMaterial).alpha = 0.34 * shrink;

    rig.setFlash(f.hitFlash);
    rig.setTint(f.squelsh ? f.squelsh.tint : null);

    // A dropped prop should not stay glued to a hand.
    if (!f.carrying && side.heldProp) this.detachProp(side);

    this.chooseClip(side);
    rig.update(dt);
  }

  /**
   * Maps simulation state to an animation clip. Attacks scrub their clip to the
   * action's own playhead, so what you see is exactly the frame data the hit
   * detection is using.
   */
  private chooseClip(side: Side): void {
    const f = side.fighter;
    const rig = side.rig;

    // Being carried through someone else's throw overrides everything: the two
    // halves of the choreography are scrubbed to the same playhead.
    if (f.pairClip) {
      rig.scrub(f.pairClip, f.pairProgress);
      return;
    }

    switch (f.state) {
      case FS.ENTRANCE: rig.play('entrance'); return;

      case FS.ATTACK:
      case FS.AERIAL: {
        const a = f.action;
        if (a) rig.scrub(a.move.clip, f.actionProgress);
        return;
      }

      case FS.STUN:
        if (rig.clipName !== 'hitFront') rig.play('hitFront', { restart: true, speed: 1 });
        return;
      case FS.REVERSAL:
        if (rig.clipName !== 'reversal') rig.play('reversal', { restart: true, speed: 1 });
        return;

      case FS.ROPE_RUN: rig.play('ropeRun', { speed: 1.15 }); return;
      case FS.WHIPPED: rig.play('whipped', { speed: 1 }); return;
      case FS.APRON: rig.play('apron', { speed: 1 }); return;
      case FS.CORNERED: rig.play('cornered', { speed: 1 }); return;

      case FS.CLIMB: rig.scrub('climb', clamp(f.stateTime / 520, 0, 1)); return;
      case FS.PERCH: rig.play('perch', { speed: 1 }); return;

      case FS.GRAPPLE_START: {
        const a = f.action;
        rig.scrub('grappleStart', a ? clamp(a.elapsed / a.move.startupMs, 0, 1) : 1);
        return;
      }
      case FS.GRAPPLING: case FS.DRAGGING: rig.play('grappleHold', { speed: 1 }); return;
      case FS.GRAPPLED: case FS.DRAGGED: rig.play('grappled', { speed: 1 }); return;

      case FS.THROWN:
        if (rig.clipName !== 'knockdown') {
          rig.play('knockdown', { restart: true, speed: 1, hold: true });
        }
        return;
      case FS.DOWN: rig.play('grounded', { speed: 1 }); return;
      case FS.GETUP: rig.scrub('getUp', clamp(f.stateTime / TUNING.combat.getUpMs, 0, 1)); return;

      case FS.PIN: rig.play('pin', { speed: 1 }); return;
      case FS.PINNED: rig.play('pinned', { speed: 1 }); return;

      case FS.TAUNT: {
        const t = f.activeTaunt;
        const clip = t?.clip ?? 'tauntShort';
        rig.scrub(clip, clamp(f.stateTime / (t?.durationMs ?? 900), 0, 1));
        return;
      }

      case FS.WIN: rig.play('victory', { speed: 1 }); return;
      case FS.LOSE: rig.play('defeat', { speed: 1 }); return;

      case FS.RUN: {
        const sp = clamp(Math.hypot(f.vx, f.vz) / (f.cfg.stats.speed * TUNING.move.run), 0.5, 1.6);
        rig.play('run', { speed: sp });
        return;
      }
      case FS.WALK: {
        const sp = clamp(Math.hypot(f.vx, f.vz) / (f.cfg.stats.speed * TUNING.move.walk), 0.45, 1.5);
        rig.play('walk', { speed: sp });
        return;
      }
      default:
        rig.play('idle', { speed: 1 });
    }
  }

  dispose(): void {
    for (const s of this.sides) {
      this.stage?.removeShadowCasters(s.rig.meshes);
      s.rig.dispose();
      s.shadow.dispose();
      this.detachProp(s);
    }
    this.despawnCan();
    this.groundProp?.dispose(false, true);
    this.ring.root.dispose(false, true);
    this.warehouse.root.dispose(false, true);
  }
}
