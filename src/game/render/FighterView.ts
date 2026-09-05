import Phaser from 'phaser';
import type { ArenaConfig, Flourish, RigSpec, WrestlerConfig } from '@/game/types';
import { TUNING } from '@/game/config/tuning';
import type { Fighter } from '@/game/combat/Fighter';
import { FS } from '@/game/combat/states';
import { clipDuration, samplePose, type Pose } from './poses';
import { shade } from '@/game/utils/math';

const D = Math.PI / 180;

interface Vec { x: number; y: number }
const v = (x: number, y: number): Vec => ({ x, y });

function rot(p: Vec, deg: number): Vec {
  const a = deg * D;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return v(p.x * c - p.y * s, p.x * s + p.y * c);
}
const add = (a: Vec, b: Vec): Vec => v(a.x + b.x, a.y + b.y);
/** Unit vector for a limb angle: 0 = straight down, positive swings forward. */
const dir = (deg: number): Vec => v(Math.sin(deg * D), Math.cos(deg * D));

/** Clips where the front hand crowds the head, so the prop is not drawn. */
const PROP_HIDDEN: ReadonlySet<string> = new Set([
  'grappleStart', 'grappleHold', 'grappled', 'grappleThrow',
  'hurt', 'down', 'getUp', 'pinned', 'pin', 'block', 'loss',
]);

interface DrawOpts {
  inflate: number;
  color?: number;
  alpha: number;
}

/**
 * Draws a wrestler entirely from data — no bitmap assets, no photography.
 * Silhouette readability comes from a rim pass drawn behind an inked body pass.
 */
export class FighterView {
  readonly root: Phaser.GameObjects.Container;
  private shadow: Phaser.GameObjects.Graphics;
  private rim: Phaser.GameObjects.Graphics;
  private body: Phaser.GameObjects.Graphics;
  private fxLayer: Phaser.GameObjects.Graphics;
  private cfg: WrestlerConfig;
  private rig: RigSpec;
  private loopTime = 0;
  private currentClip = 'idle';
  private arena: ArenaConfig;
  /** Menus place the rig directly instead of using ring coordinates. */
  overridePlacement: { x: number; y: number; scale: number } | null = null;

  constructor(scene: Phaser.Scene, cfg: WrestlerConfig, arena: ArenaConfig) {
    this.cfg = cfg;
    this.rig = cfg.rig;
    this.arena = arena;
    this.shadow = scene.add.graphics();
    this.rim = scene.add.graphics();
    this.body = scene.add.graphics();
    this.fxLayer = scene.add.graphics();
    this.root = scene.add.container(0, 0, [this.rim, this.body, this.fxLayer]);
  }

  /** The mat shadow lives outside the fighter container so it never flips/scales. */
  get shadowObject(): Phaser.GameObjects.Graphics { return this.shadow; }

  /** Everything the world camera should draw for this fighter. */
  get objects(): Phaser.GameObjects.GameObject[] { return [this.root, this.shadow]; }

  setArena(a: ArenaConfig): void { this.arena = a; }

  update(f: Fighter, dtMs: number, lowFx: boolean): void {
    this.loopTime += dtMs / 1000;

    const clip = f.anim;
    this.currentClip = clip;
    const t = this.sampleTime(f, clip);
    const pose = samplePose(clip, t);

    const op = this.overridePlacement;
    const scale = op
      ? op.scale * this.rig.scale
      : Phaser.Math.Linear(TUNING.ring.scaleBack, TUNING.ring.scaleFront, f.depth) * this.rig.scale;

    const sx = op ? op.x : TUNING.ring.centerX + f.x;
    const sy = op ? op.y : TUNING.ring.baseY + f.depth * this.arena.ringDepth - f.z;

    this.root.setPosition(sx + pose.ox * scale, sy + pose.oy * scale);
    this.root.setScale(f.facing * scale, scale);
    this.root.setRotation(pose.tilt * D * (pose.lying ? 1 : 0.25) * f.facing);
    this.root.setDepth(200 + f.depth * 100);

    // mat shadow
    this.shadow.clear();
    if (op) { this.shadow.setVisible(false); } else { this.shadow.setVisible(true); }
    this.shadow.setDepth(199 + f.depth * 100);
    const shrink = 1 - Math.min(0.55, f.z / 240);
    this.shadow.fillStyle(0x000000, 0.34 * shrink);
    this.shadow.fillEllipse(sx, TUNING.ring.baseY + f.depth * this.arena.ringDepth + 4,
      64 * scale * shrink, 15 * scale * shrink);

    this.rim.clear();
    this.body.clear();
    this.fxLayer.clear();

    const auraBuff = f.buffs.length > 0;
    const rimColor = auraBuff ? (f.buffs[f.buffs.length - 1]!.tint ?? this.rig.rim) : this.rig.rim;

    if (!lowFx) {
      this.drawFigure(this.rim, pose, { inflate: 4.5, color: rimColor, alpha: auraBuff ? 0.85 : 0.5 });
    }
    this.drawFigure(this.body, pose, { inflate: 0, alpha: 1 });

    if (f.hitFlash > 0.02) {
      this.drawFigure(this.fxLayer, pose, { inflate: 1, color: 0xffffff, alpha: f.hitFlash * 0.9 });
    }
    if (f.chargeRatio > 0.08) this.drawChargeTell(f.chargeRatio, pose);
    if (f.state === FS.BLOCK) this.drawGuard(pose, f.blockAge);
  }

  /** Attack clips are re-timed so the swing lands exactly on the active frames. */
  private sampleTime(f: Fighter, clip: string): number {
    if (f.state === FS.ATTACK && f.action) {
      const m = f.action.move;
      const e = f.action.elapsed;
      if (e < m.startup) return (e / m.startup) * 0.5;
      if (e < m.startup + m.active) return 0.5 + ((e - m.startup) / m.active) * 0.18;
      const r = (e - m.startup - m.active) / Math.max(1, m.recovery);
      return 0.68 + r * 0.32;
    }
    const dur = clipDuration(clip);
    switch (clip) {
      case 'walk': case 'run':
        return (this.loopTime / dur) % 1;
      case 'getUp':
        return Math.min(1, (f.stateTime * 1000) / TUNING.combat.getUpMs);
      case 'hurt':
        return Math.min(1, Math.max(0, f.stateTime + 0.35) * 2.4);
      case 'reversal':
        return Math.min(1, f.stateTime / 0.42);
      case 'taunt':
        return Math.min(1, (f.stateTime * 1000) / TUNING.combat.tauntMs);
      default:
        return (this.loopTime / dur) % 1;
    }
  }

  /* ---------------------------------------------------------------- *
   * figure drawing
   * ---------------------------------------------------------------- */

  private drawFigure(g: Phaser.GameObjects.Graphics, p: Pose, o: DrawOpts): void {
    const r = this.rig;
    const bulk = r.bulk;
    const ink = 0x140a1c;

    const hip = v(0, -56 * p.crouch);
    const shoulder = add(hip, rot(v(0, -46 * p.crouch), p.spine));
    const chest = add(hip, rot(v(0, -26 * p.crouch), p.spine));
    const headC = add(shoulder, rot(v(2, -22), p.spine + p.head));

    const col = (c: number): number => o.color ?? c;
    const A = o.alpha;
    const inf = o.inflate;

    // --- back flourishes (wings / tail) ---
    for (const fl of r.flourishes) {
      if (fl.kind === 'wings') this.drawWings(g, chest, fl, col(fl.color), A * 0.8, inf);
      if (fl.kind === 'tailStinger') this.drawTail(g, hip, fl, col(fl.color), A, inf);
    }

    // --- back leg / back arm ---
    this.limb(g, hip, p.legB, 30, 28, 11 * bulk + inf, col(shade(r.outfit, -0.28)), A, col(r.boots), inf);
    this.limb(g, shoulder, p.armB, 25, 23, 9 * bulk + inf, col(shade(r.skin, -0.25)), A, col(shade(r.gloves, -0.2)), inf);

    // --- extra arms (RAID) drawn behind the torso ---
    for (const fl of r.flourishes) {
      if (fl.kind !== 'extraArms') continue;
      const s = fl.scale ?? 0.8;
      const anchor = add(chest, rot(v(-2, 6), p.spine));
      this.limb(g, anchor, [p.armB[0] * 0.7 + 34, p.armB[1] * 0.6 - 18], 25 * s, 22 * s,
        (8 * bulk + inf) * s, col(fl.color), A * 0.95, col(fl.color2 ?? fl.color), inf);
      this.limb(g, anchor, [p.armF[0] * 0.7 - 26, p.armF[1] * 0.6 - 12], 24 * s, 21 * s,
        (8 * bulk + inf) * s, col(shade(fl.color, -0.15)), A * 0.95, col(fl.color2 ?? fl.color), inf);
    }

    // --- torso ---
    const halfW = (13.5 * bulk) + inf;
    const hipW = (11 * bulk) + inf;
    const tp = [
      add(shoulder, rot(v(-halfW, -4), p.spine)),
      add(shoulder, rot(v(halfW, -4), p.spine)),
      add(hip, rot(v(hipW, 6), p.spine)),
      add(hip, rot(v(-hipW, 6), p.spine)),
    ];
    g.fillStyle(col(r.outfit), A);
    g.beginPath();
    g.moveTo(tp[0]!.x, tp[0]!.y);
    for (let i = 1; i < tp.length; i++) g.lineTo(tp[i]!.x, tp[i]!.y);
    g.closePath();
    g.fillPath();
    if (!o.color) {
      g.lineStyle(2.2, ink, 0.9);
      g.strokePath();
      // trim stripe
      const s1 = add(hip, rot(v(-hipW * 0.8, -2), p.spine));
      const s2 = add(shoulder, rot(v(halfW * 0.55, -2), p.spine));
      g.lineStyle(4.5, r.trim, 0.9);
      g.lineBetween(s1.x, s1.y, s2.x, s2.y);
    }

    // --- torso flourishes ---
    for (const fl of r.flourishes) {
      if (fl.kind === 'carapace') this.drawCarapace(g, hip, shoulder, p, fl, col(fl.color), A, inf);
      if (fl.kind === 'sash') this.drawSash(g, hip, shoulder, p, col(fl.color), A);
      if (fl.kind === 'shoulderpads') this.drawPads(g, shoulder, p, fl, col(fl.color), A, inf);
    }

    // --- head ---
    for (const fl of r.flourishes) {
      if (fl.kind === 'bighair') this.drawBigHair(g, headC, p, fl, col(fl.color), A, inf);
    }
    g.fillStyle(col(r.skin), A);
    g.fillCircle(headC.x, headC.y, 13.5 + inf);
    if (!o.color) {
      g.lineStyle(2.2, ink, 0.9);
      g.strokeCircle(headC.x, headC.y, 13.5);
      // face beat: a single hard shadow so the head reads at phone size
      g.fillStyle(shade(r.skin, -0.35), 0.55);
      g.fillEllipse(headC.x - 5, headC.y + 1, 9, 13);
      g.fillStyle(r.trim, 0.95);
      g.fillEllipse(headC.x + 5.5, headC.y - 2, 4.5, 3);
    }
    for (const fl of r.flourishes) {
      if (fl.kind === 'antennae') this.drawAntennae(g, headC, p, fl, col(fl.color), A, inf);
      if (fl.kind === 'mandibles') this.drawMandibles(g, headC, p, col(fl.color), A, inf);
      if (fl.kind === 'visor') this.drawVisor(g, headC, p, col(fl.color), A);
      if (fl.kind === 'crown') this.drawCrown(g, headC, p, fl, col(fl.color), A, inf);
    }

    // --- front leg / front arm ---
    this.limb(g, hip, p.legF, 30, 28, 11 * bulk + inf, col(r.outfitAlt), A, col(r.boots), inf);
    const handF = this.limb(g, shoulder, p.armF, 25, 23, 9 * bulk + inf, col(r.skin), A, col(r.gloves), inf);

    // --- prop in the front hand ---
    // Hidden in clinches and on the mat, where the hand sits over the face.
    if (this.cfg.prop && this.cfg.prop.shape !== 'none' && !o.color
        && !PROP_HIDDEN.has(this.currentClip)) {
      this.drawProp(g, handF, p.armF[0] + p.armF[1] + p.prop, A);
    }
  }

  /** Two-bone limb. Returns the hand/foot position. */
  private limb(
    g: Phaser.GameObjects.Graphics, origin: Vec, angles: [number, number],
    len1: number, len2: number, thick: number, color: number, alpha: number,
    endColor: number, inflate: number,
  ): Vec {
    const a1 = angles[0];
    const a2 = angles[0] + angles[1];
    const d1 = dir(a1);
    const joint = v(origin.x + d1.x * len1, origin.y + d1.y * len1);
    const d2 = dir(a2);
    const end = v(joint.x + d2.x * len2, joint.y + d2.y * len2);

    if (inflate === 0) {
      g.lineStyle(thick + 3.4, 0x140a1c, Math.min(1, alpha));
      g.lineBetween(origin.x, origin.y, joint.x, joint.y);
      g.lineBetween(joint.x, joint.y, end.x, end.y);
    }
    g.lineStyle(thick, color, alpha);
    g.lineBetween(origin.x, origin.y, joint.x, joint.y);
    g.lineBetween(joint.x, joint.y, end.x, end.y);
    g.fillStyle(color, alpha);
    g.fillCircle(joint.x, joint.y, thick * 0.5);
    g.fillStyle(endColor, alpha);
    g.fillCircle(end.x, end.y, thick * 0.62 + 1.5);
    return end;
  }

  /* ------------------------- flourishes --------------------------- */

  private drawBigHair(g: Phaser.GameObjects.Graphics, h: Vec, p: Pose, fl: Flourish,
    color: number, a: number, inf: number): void {
    const s = (fl.scale ?? 1) * 1;
    const up = rot(v(0, -14 * s), p.spine + p.head);
    const c = add(h, up);
    g.fillStyle(color, a);
    g.fillCircle(c.x - 10 * s, c.y + 2, (11 + inf) * s);
    g.fillCircle(c.x + 9 * s, c.y + 1, (11 + inf) * s);
    g.fillCircle(c.x - 2 * s, c.y - 8 * s, (13 + inf) * s);
    g.fillCircle(c.x - 16 * s, c.y + 12 * s, (8 + inf) * s);
    g.fillCircle(c.x + 14 * s, c.y + 12 * s, (8 + inf) * s);
    if (inf === 0 && fl.color2 !== undefined) {
      g.fillStyle(fl.color2, 0.9);
      g.fillCircle(c.x - 2 * s, c.y - 12 * s, 4 * s);
      g.fillCircle(c.x + 13 * s, c.y - 1 * s, 3 * s);
    }
  }

  private drawPads(g: Phaser.GameObjects.Graphics, sh: Vec, p: Pose, fl: Flourish,
    color: number, a: number, inf: number): void {
    const s = fl.scale ?? 1;
    for (const side of [-1, 1]) {
      const c = add(sh, rot(v(side * 15 * s, -3), p.spine));
      g.fillStyle(color, a);
      g.beginPath();
      g.moveTo(c.x - (12 + inf) * s, c.y + (8 + inf) * s);
      g.lineTo(c.x, c.y - (12 + inf) * s);
      g.lineTo(c.x + (12 + inf) * s, c.y + (8 + inf) * s);
      g.closePath();
      g.fillPath();
      if (inf === 0) {
        g.lineStyle(2, 0x140a1c, 0.9);
        g.strokePath();
        if (fl.color2 !== undefined) {
          g.fillStyle(fl.color2, 0.95);
          g.fillCircle(c.x, c.y - 2 * s, 3 * s);
        }
      }
    }
  }

  private drawCarapace(g: Phaser.GameObjects.Graphics, hip: Vec, sh: Vec, p: Pose,
    fl: Flourish, color: number, a: number, inf: number): void {
    for (let i = 0; i < 3; i++) {
      const t = 0.2 + i * 0.3;
      const c = v(hip.x + (sh.x - hip.x) * t, hip.y + (sh.y - hip.y) * t);
      const w = (16 - i * 2.2) + inf;
      g.fillStyle(i % 2 === 0 ? color : (fl.color2 ?? color), a * 0.95);
      const e = rot(v(0, 0), p.spine);
      g.fillEllipse(c.x + e.x, c.y + e.y, w * 2, 9 + inf);
    }
  }

  private drawSash(g: Phaser.GameObjects.Graphics, hip: Vec, sh: Vec, p: Pose,
    color: number, a: number): void {
    const p1 = add(sh, rot(v(-12, 0), p.spine));
    const p2 = add(hip, rot(v(12, 4), p.spine));
    g.lineStyle(7, color, a * 0.95);
    g.lineBetween(p1.x, p1.y, p2.x, p2.y);
  }

  private drawAntennae(g: Phaser.GameObjects.Graphics, h: Vec, p: Pose, fl: Flourish,
    color: number, a: number, inf: number): void {
    const s = fl.scale ?? 1;
    const sway = Math.sin(this.loopTime * 5) * 6;
    for (const side of [-1, 1]) {
      const base = add(h, rot(v(side * 5, -11), p.spine + p.head));
      const mid = add(base, rot(v(side * 9 * s, -15 * s), sway * side));
      const tip = add(mid, rot(v(side * 12 * s, -11 * s), sway * side * 1.6));
      g.lineStyle(3.6 + inf, color, a);
      g.lineBetween(base.x, base.y, mid.x, mid.y);
      g.lineBetween(mid.x, mid.y, tip.x, tip.y);
      g.fillStyle(fl.color2 ?? color, a);
      g.fillCircle(tip.x, tip.y, (4 + inf) * s);
    }
  }

  private drawMandibles(g: Phaser.GameObjects.Graphics, h: Vec, p: Pose,
    color: number, a: number, inf: number): void {
    for (const side of [-1, 1]) {
      const base = add(h, rot(v(9, side * 4), p.spine + p.head));
      const tip = add(base, rot(v(9, side * 7), p.spine + p.head));
      g.lineStyle(3 + inf, color, a);
      g.lineBetween(base.x, base.y, tip.x, tip.y);
    }
  }

  private drawVisor(g: Phaser.GameObjects.Graphics, h: Vec, p: Pose, color: number, a: number): void {
    const c = add(h, rot(v(2, -2), p.spine + p.head));
    g.fillStyle(color, a * 0.95);
    g.fillRect(c.x - 12, c.y - 4, 22, 7);
  }

  private drawCrown(g: Phaser.GameObjects.Graphics, h: Vec, p: Pose, fl: Flourish,
    color: number, a: number, inf: number): void {
    const c = add(h, rot(v(0, -13), p.spine + p.head));
    g.fillStyle(color, a);
    for (let i = -1; i <= 1; i++) {
      g.beginPath();
      g.moveTo(c.x + i * 8 - 4 - inf, c.y + 2);
      g.lineTo(c.x + i * 8, c.y - 10 - inf);
      g.lineTo(c.x + i * 8 + 4 + inf, c.y + 2);
      g.closePath();
      g.fillPath();
    }
    void fl;
  }

  private drawWings(g: Phaser.GameObjects.Graphics, c: Vec, fl: Flourish,
    color: number, a: number, inf: number): void {
    const flap = Math.sin(this.loopTime * 9) * 8;
    for (const side of [-1, 1]) {
      g.fillStyle(color, a * 0.45);
      g.fillEllipse(c.x - 12, c.y - 6 + side * 4 + flap * side * 0.4, 42 + inf, 16 + inf);
    }
    void fl;
  }

  private drawTail(g: Phaser.GameObjects.Graphics, hip: Vec, fl: Flourish,
    color: number, a: number, inf: number): void {
    const sway = Math.sin(this.loopTime * 3.4) * 10;
    let cur = v(hip.x - 8, hip.y + 2);
    let ang = 120 + sway;
    g.lineStyle(7 + inf, color, a);
    for (let i = 0; i < 4; i++) {
      const d = dir(ang);
      const nxt = v(cur.x + d.x * 11, cur.y + d.y * 11);
      g.lineBetween(cur.x, cur.y, nxt.x, nxt.y);
      cur = nxt;
      ang -= 22;
    }
    g.fillStyle(fl.color2 ?? color, a);
    g.fillCircle(cur.x, cur.y, 5 + inf);
  }

  /* ------------------------- prop ---------------------------------- */

  private drawProp(g: Phaser.GameObjects.Graphics, hand: Vec, angle: number, a: number): void {
    const prop = this.cfg.prop!;
    const A = angle * D;
    const push = (x: number, y: number): Vec => v(
      hand.x + x * Math.cos(A) - y * Math.sin(A),
      hand.y + x * Math.sin(A) + y * Math.cos(A),
    );
    g.lineStyle(2.2, 0x140a1c, 0.9);
    switch (prop.shape) {
      case 'briefcase': {
        const c = push(0, 12);
        g.fillStyle(prop.color, a);
        g.fillRect(c.x - 15, c.y - 10, 30, 21);
        g.strokeRect(c.x - 15, c.y - 10, 30, 21);
        g.fillStyle(prop.color2 ?? 0x140a1c, a);
        g.fillRect(c.x - 15, c.y - 1, 30, 4);
        g.fillRect(c.x - 4, c.y - 13, 8, 4);
        break;
      }
      case 'canister': {
        const c = push(0, 13);
        g.fillStyle(prop.color2 ?? 0x1c3a12, a);
        g.fillRoundedRect(c.x - 8, c.y - 14, 16, 26, 5);
        g.strokeRoundedRect(c.x - 8, c.y - 14, 16, 26, 5);
        g.fillStyle(prop.color, a);
        g.fillRect(c.x - 6, c.y - 8, 12, 8);
        g.fillCircle(c.x, c.y - 17, 4);
        break;
      }
      case 'syringe': {
        const c = push(0, 14);
        g.fillStyle(prop.color, a);
        g.fillRect(c.x - 5, c.y - 18, 10, 30);
        g.strokeRect(c.x - 5, c.y - 18, 10, 30);
        g.lineStyle(3, prop.color2 ?? 0xffffff, a);
        g.lineBetween(c.x, c.y + 12, c.x, c.y + 24);
        break;
      }
      case 'microphone': {
        const c = push(0, 12);
        g.fillStyle(prop.color2 ?? 0x222222, a);
        g.fillRect(c.x - 3.5, c.y - 4, 7, 26);
        g.fillStyle(prop.color, a);
        g.fillCircle(c.x, c.y - 10, 9);
        g.strokeCircle(c.x, c.y - 10, 9);
        break;
      }
      case 'sign': {
        const c = push(0, 14);
        g.fillStyle(prop.color2 ?? 0x140a1c, a);
        g.fillRect(c.x - 2, c.y - 4, 4, 24);
        g.fillStyle(prop.color, a);
        g.fillRect(c.x - 16, c.y - 20, 32, 18);
        g.strokeRect(c.x - 16, c.y - 20, 32, 18);
        break;
      }
    }
  }

  /* ------------------------- tells --------------------------------- */

  private drawChargeTell(ratio: number, p: Pose): void {
    const c = v(0, -74 * p.crouch);
    const g = this.fxLayer;
    g.lineStyle(3, 0xffffff, 0.25 + ratio * 0.5);
    g.strokeCircle(c.x, c.y, 34 + (1 - ratio) * 26);
    g.lineStyle(5, this.rig.aura, 0.35 + ratio * 0.6);
    g.beginPath();
    g.arc(c.x, c.y, 34, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio, false);
    g.strokePath();
  }

  private drawGuard(p: Pose, blockAge: number): void {
    const g = this.fxLayer;
    const fresh = blockAge <= TUNING.combat.reversalWindow;
    const c = v(4, -62 * p.crouch);
    g.lineStyle(fresh ? 4 : 2.2, fresh ? 0xffffff : 0x8fa6c9, fresh ? 0.85 : 0.4);
    g.strokeCircle(c.x, c.y, 30);
  }

  setVisible(vis: boolean): void {
    this.root.setVisible(vis);
    this.shadow.setVisible(vis);
  }

  destroy(): void {
    this.root.destroy(true);
    this.shadow.destroy();
  }
}
