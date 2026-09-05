import Phaser from 'phaser';
import type {
  ArenaConfig, CostumeSpec, FaceSpec, FigureSpec, Flourish, RigSpec, WigSpec, WrestlerConfig,
} from '@/game/types';
import { TUNING } from '@/game/config/tuning';
import type { Fighter } from '@/game/combat/Fighter';
import { FS } from '@/game/combat/states';
import { clipDuration, samplePose, type Pose } from './poses';
import { shade } from '@/game/utils/math';

const D = Math.PI / 180;
const INK = 0x140a1c;

interface Vec { x: number; y: number }
const v = (x: number, y: number): Vec => ({ x, y });

function rot(p: Vec, deg: number): Vec {
  const a = deg * D;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return v(p.x * c - p.y * s, p.x * s + p.y * c);
}
const add = (a: Vec, b: Vec): Vec => v(a.x + b.x, a.y + b.y);
const mix = (a: Vec, b: Vec, t: number): Vec => v(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
/** Unit vector for a limb angle: 0 = straight down, positive swings forward. */
const dir = (deg: number): Vec => v(Math.sin(deg * D), Math.cos(deg * D));

/** Clips where the front hand crowds the head, so the prop is not drawn. */
const PROP_HIDDEN: ReadonlySet<string> = new Set([
  'grappleStart', 'grappleHold', 'grappled', 'grappleThrow',
  'hurt', 'down', 'getUp', 'pinned', 'pin', 'block', 'loss',
]);

const DEFAULT_FIGURE: FigureSpec = {
  shoulders: 1, bust: 1, waist: 0.82, hips: 1.25, legs: 1, heel: 7,
};
const DEFAULT_FACE: FaceSpec = {
  lash: INK, lip: 0xd82b5c, brow: INK, shadow: 0x7a2bff, kind: 'glam',
};
const DEFAULT_COSTUME: CostumeSpec = { kind: 'leotard', longGloves: true, longBoots: true };

interface DrawOpts {
  inflate: number;
  /** When set, the whole figure is drawn flat in this colour (rim / flash pass). */
  color?: number;
  alpha: number;
}

/**
 * Draws a wrestler entirely from data -- no bitmap assets, no photography.
 *
 * The shapes are built to read as DRAG WRESTLERS at phone size: exaggerated
 * hourglass, big wig volume, platform boots, elbow gloves and painted faces.
 * Silhouette separation comes from a rim pass drawn behind an inked body pass.
 */
export class FighterView {
  readonly root: Phaser.GameObjects.Container;
  private shadow: Phaser.GameObjects.Graphics;
  private rim: Phaser.GameObjects.Graphics;
  private body: Phaser.GameObjects.Graphics;
  private fxLayer: Phaser.GameObjects.Graphics;
  private cfg: WrestlerConfig;
  private rig: RigSpec;
  private fig: FigureSpec;
  private face: FaceSpec;
  private costume: CostumeSpec;
  private wig: WigSpec | null;
  private loopTime = 0;
  private currentClip = 'idle';
  private arena: ArenaConfig;
  /** Menus place the rig directly instead of using ring coordinates. */
  overridePlacement: { x: number; y: number; scale: number } | null = null;

  constructor(scene: Phaser.Scene, cfg: WrestlerConfig, arena: ArenaConfig) {
    this.cfg = cfg;
    this.rig = cfg.rig;
    this.fig = { ...DEFAULT_FIGURE, ...(cfg.rig.figure ?? {}) };
    this.face = { ...DEFAULT_FACE, ...(cfg.rig.face ?? {}) };
    this.costume = { ...DEFAULT_COSTUME, ...(cfg.rig.costume ?? {}) };
    this.wig = cfg.rig.wig ?? null;
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
      this.drawFigure(this.rim, pose, { inflate: 4, color: rimColor, alpha: auraBuff ? 0.85 : 0.42 });
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
   * figure
   * ---------------------------------------------------------------- */

  private drawFigure(g: Phaser.GameObjects.Graphics, p: Pose, o: DrawOpts): void {
    const r = this.rig;
    const F = this.fig;
    const bulk = r.bulk;
    const flat = o.color !== undefined;
    const col = (c: number): number => o.color ?? c;
    const A = o.alpha;
    const inf = o.inflate;

    // --- skeleton -----------------------------------------------------
    const hip = v(0, -58 * p.crouch * F.legs);
    const up = (d: number): Vec => add(hip, rot(v(0, -d * p.crouch), p.spine));
    const waist = up(16);
    const chest = up(34);
    const shoulder = up(48);
    const headC = add(shoulder, rot(v(2, -29), p.spine + p.head));

    const shW = 14 * bulk * F.shoulders;
    const buW = 15.5 * bulk * F.bust;
    const waW = 10 * bulk * F.waist;
    const hiW = 13 * bulk * F.hips;

    // --- behind everything --------------------------------------------
    for (const fl of r.flourishes) {
      if (fl.kind === 'wings') this.drawWings(g, chest, fl, col(fl.color), A * 0.8, inf);
      if (fl.kind === 'tailStinger') this.drawTail(g, hip, fl, col(fl.color), A, inf);
    }
    if (this.wig) this.drawWigBack(g, headC, p, this.wig, col(this.wig.color), A, inf, flat);

    // --- back limbs ----------------------------------------------------
    const hipL = add(hip, rot(v(-hiW * 0.38, -1), p.spine));
    const hipR = add(hip, rot(v(hiW * 0.38, -1), p.spine));
    this.leg(g, hipL, p.legB, shade(r.outfit, -0.3), shade(r.boots, -0.18), A, col, inf, F, bulk, o);
    const shL = add(shoulder, rot(v(-shW * 0.9, 1), p.spine));
    const shR = add(shoulder, rot(v(shW * 0.9, 1), p.spine));
    this.arm(g, shL, p.armB, shade(r.skin, -0.26), shade(r.gloves, -0.2), A, col, inf, bulk, o);

    // --- extra arms (insect personas) sit behind the torso -------------
    for (const fl of r.flourishes) {
      if (fl.kind !== 'extraArms') continue;
      const sc = fl.scale ?? 0.8;
      const n = fl.count ?? 2;
      const anchor = add(waist, rot(v(-1, 4), p.spine));
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0.5 : i / (n - 1);
        // fan them out to both sides, lower ones reaching further down
        const swing = -104 + t * 208;
        const droop = 16 + Math.sin(t * Math.PI) * 16;
        const wobble = Math.sin(this.loopTime * 3 + i * 1.3) * 5;
        const end = this.limb(
          g, anchor, [swing + wobble, droop], 30 * sc, 27 * sc,
          (6.6 * bulk + inf) * sc,
          col(i % 2 === 0 ? fl.color : shade(fl.color, -0.12)), A * 0.95,
          col(fl.color2 ?? fl.color), inf, flat,
        );
        // claw
        if (!flat) {
          const cd = dir(swing + wobble + droop);
          g.lineStyle(3.2 * sc, fl.color2 ?? fl.color, A);
          for (const off of [-26, 0, 26]) {
            const d2 = dir(swing + wobble + droop + off);
            g.lineBetween(end.x, end.y, end.x + d2.x * 11 * sc, end.y + d2.y * 11 * sc);
          }
          void cd;
        }
      }
    }

    // --- torso: an hourglass, not a box --------------------------------
    const side = (w: number, node: Vec, dx: number): Vec =>
      add(node, rot(v(dx * (w + inf), 0), p.spine));
    const outline: Vec[] = [
      side(shW, shoulder, -1), side(shW, shoulder, 1),
      side(buW, chest, 1), side(waW, waist, 1), side(hiW, hip, 1),
      add(hip, rot(v(0, 8 + inf), p.spine)),
      side(hiW, hip, -1), side(waW, waist, -1), side(buW, chest, -1),
    ];
    g.fillStyle(col(r.outfit), A);
    g.beginPath();
    g.moveTo(outline[0]!.x, outline[0]!.y);
    for (let i = 1; i < outline.length; i++) g.lineTo(outline[i]!.x, outline[i]!.y);
    g.closePath();
    g.fillPath();
    if (!flat) {
      g.lineStyle(2.4, INK, 0.92);
      g.strokePath();
    }

    if (!flat) {
      this.drawCostume(g, { hip, waist, chest, shoulder }, { shW, buW, waW, hiW }, p, A);
      if (F.bust > 0.15) this.drawBust(g, chest, p, buW, A);
    }

    // --- torso flourishes ---------------------------------------------
    for (const fl of r.flourishes) {
      if (fl.kind === 'carapace') this.drawCarapace(g, hip, shoulder, p, fl, col(fl.color), A, inf);
      if (fl.kind === 'sash') this.drawSash(g, hip, shoulder, p, col(fl.color), A);
      if (fl.kind === 'shoulderpads') this.drawPads(g, shoulder, p, fl, col(fl.color), A, inf, flat);
    }

    // --- head ----------------------------------------------------------
    for (const fl of r.flourishes) {
      if (fl.kind === 'bighair') this.drawBigHair(g, headC, p, fl, col(fl.color), A, inf, flat);
      if (fl.kind === 'crest') this.drawCrest(g, headC, p, fl, col(fl.color), A, inf);
    }
    const headR = 14.5 + inf;
    g.fillStyle(col(r.skin), A);
    const wideSkull = this.face.kind === 'insect' || this.face.kind === 'maw';
    if (wideSkull) {
      // wider, lower skull with a heavy brow
      g.fillEllipse(headC.x, headC.y, headR * 2.15, headR * 1.85);
    } else {
      g.fillCircle(headC.x, headC.y, headR);
      g.fillEllipse(headC.x + 1, headC.y + headR * 0.74, headR * 1.1, headR * 0.66);
    }
    if (this.wig) this.drawWigCap(g, headC, p, this.wig, col(this.wig.color), A, inf, flat);
    if (!flat) {
      g.lineStyle(2.4, INK, 0.92);
      if (wideSkull) g.strokeEllipse(headC.x, headC.y, 14.5 * 2.15, 14.5 * 1.85);
      else g.strokeCircle(headC.x, headC.y, 14.5);
      this.drawFace(g, headC, p, A);
    }
    for (const fl of r.flourishes) {
      if (fl.kind === 'antennae') this.drawAntennae(g, headC, p, fl, col(fl.color), A, inf);
      if (fl.kind === 'mandibles') this.drawMandibles(g, headC, p, col(fl.color), A, inf);
      if (fl.kind === 'visor') this.drawVisor(g, headC, p, col(fl.color), A);
      if (fl.kind === 'crown') this.drawCrown(g, headC, p, fl, col(fl.color), A, inf);
    }
    if (this.wig) this.drawWigFront(g, headC, p, this.wig, col(this.wig.color), A, inf, flat);

    // --- front limbs ---------------------------------------------------
    this.leg(g, hipR, p.legF, r.outfitAlt, r.boots, A, col, inf, F, bulk, o);
    const handF = this.arm(g, shR, p.armF, r.skin, r.gloves, A, col, inf, bulk, o);

    // --- prop -----------------------------------------------------------
    if (this.cfg.prop && this.cfg.prop.shape !== 'none' && !flat
        && !PROP_HIDDEN.has(this.currentClip)) {
      this.drawProp(g, handF, p.armF[0] + p.armF[1] + p.prop, A);
    }
  }

  /* ---------------------------------------------------------------- *
   * limbs
   * ---------------------------------------------------------------- */

  /** Arm with an elbow-length glove. */
  private arm(
    g: Phaser.GameObjects.Graphics, origin: Vec, angles: [number, number],
    skin: number, glove: number, A: number,
    col: (c: number) => number, inf: number, bulk: number, o: DrawOpts,
  ): Vec {
    const flat = o.color !== undefined;
    const thick = 8.4 * bulk + inf;
    const a1 = angles[0];
    const a2 = angles[0] + angles[1];
    const d1 = dir(a1);
    const elbow = v(origin.x + d1.x * 25, origin.y + d1.y * 25);
    const d2 = dir(a2);
    const hand = v(elbow.x + d2.x * 24, elbow.y + d2.y * 24);

    if (!flat) {
      g.lineStyle(thick + 3.6, INK, Math.min(1, A));
      g.lineBetween(origin.x, origin.y, elbow.x, elbow.y);
      g.lineBetween(elbow.x, elbow.y, hand.x, hand.y);
    }
    // upper arm is skin, forearm is the glove when the costume has long gloves
    g.lineStyle(thick, col(skin), A);
    g.lineBetween(origin.x, origin.y, elbow.x, elbow.y);
    // leg-of-mutton puff over the upper arm
    if (this.costume.puffSleeves !== undefined) {
      const puff = mix(origin, elbow, 0.14);
      g.fillStyle(col(this.costume.puffSleeves), A);
      g.fillCircle(puff.x, puff.y, thick * 1.15 + 2);
      if (!flat) {
        g.lineStyle(2.2, INK, A * 0.9);
        g.strokeCircle(puff.x, puff.y, thick * 1.15 + 2);
        g.fillStyle(0xffffff, A * 0.2);
        g.fillCircle(puff.x - 2.5, puff.y - 2.5, thick * 0.45);
      }
    }
    g.lineStyle(thick, col(this.costume.longGloves ? glove : skin), A);
    g.lineBetween(elbow.x, elbow.y, hand.x, hand.y);
    g.fillStyle(col(skin), A);
    g.fillCircle(elbow.x, elbow.y, thick * 0.5);
    g.fillStyle(col(glove), A);
    g.fillCircle(hand.x, hand.y, thick * 0.62 + 1.6);
    if (!flat && this.costume.longGloves) {
      // glove cuff
      const cuff = mix(elbow, hand, 0.08);
      g.lineStyle(2.4, shade(glove, 0.35), A);
      g.lineBetween(cuff.x - 5, cuff.y, cuff.x + 5, cuff.y);
    }
    return hand;
  }

  /** Leg with a thigh-high boot and a platform heel. */
  private leg(
    g: Phaser.GameObjects.Graphics, origin: Vec, angles: [number, number],
    tights: number, boot: number, A: number,
    col: (c: number) => number, inf: number, F: FigureSpec, bulk: number, o: DrawOpts,
  ): Vec {
    const flat = o.color !== undefined;
    const thighLen = 30 * F.legs;
    const shinLen = 28 * F.legs;
    const thick = 10.6 * bulk + inf;
    const a1 = angles[0];
    const a2 = angles[0] + angles[1];
    const d1 = dir(a1);
    const knee = v(origin.x + d1.x * thighLen, origin.y + d1.y * thighLen);
    const d2 = dir(a2);
    const ankle = v(knee.x + d2.x * shinLen, knee.y + d2.y * shinLen);

    if (!flat) {
      g.lineStyle(thick + 3.6, INK, Math.min(1, A));
      g.lineBetween(origin.x, origin.y, knee.x, knee.y);
      g.lineBetween(knee.x, knee.y, ankle.x, ankle.y);
    }
    const longBoots = this.costume.longBoots;
    // upper thigh is bare/tights; the boot starts partway down and runs to the foot
    const bootTop = longBoots ? 0.42 : 1;
    const cuff = mix(origin, knee, bootTop);
    g.lineStyle(thick, col(tights), A);
    g.lineBetween(origin.x, origin.y, cuff.x, cuff.y);
    g.lineStyle(thick * 1.02, col(boot), A);
    g.lineBetween(cuff.x, cuff.y, knee.x, knee.y);
    g.lineStyle(thick * 0.94, col(boot), A);
    g.lineBetween(knee.x, knee.y, ankle.x, ankle.y);
    g.fillStyle(col(boot), A);
    g.fillCircle(knee.x, knee.y, thick * 0.48);
    if (!flat && longBoots) {
      // bright cuff line so the boot top reads against a dark arena
      g.lineStyle(3, shade(boot, 0.5), A * 0.95);
      g.lineBetween(cuff.x - thick * 0.5, cuff.y, cuff.x + thick * 0.5, cuff.y);
    }

    if (this.costume.kneePads !== undefined && !flat) {
      g.fillStyle(this.costume.kneePads, A);
      g.fillEllipse(knee.x, knee.y + 1, thick * 1.25, thick * 1.45);
      g.lineStyle(1.8, INK, A * 0.8);
      g.strokeEllipse(knee.x, knee.y + 1, thick * 1.25, thick * 1.45);
    }

    // trainers instead of heels for the wrestlers who fight in sneakers
    if (this.costume.sneakers !== undefined) {
      const sole = this.costume.sneakerStripe ?? 0x1a1a1a;
      if (!flat) {
        g.fillStyle(INK, A);
        g.fillRoundedRect(ankle.x - 8 - inf, ankle.y - 5, 26 + inf * 2, 15 + inf, 5);
      }
      g.fillStyle(col(this.costume.sneakers), A);
      g.fillRoundedRect(ankle.x - 7 - inf, ankle.y - 4, 24 + inf * 2, 12 + inf, 4);
      if (!flat) {
        g.fillStyle(0xf4f4f4, A);
        g.fillRect(ankle.x - 7, ankle.y + 6, 24, 3.5);
        g.lineStyle(2.2, sole, A);
        for (let i = 0; i < 3; i++) {
          g.lineBetween(ankle.x + 1 + i * 4, ankle.y - 3, ankle.x + 4 + i * 4, ankle.y + 5);
        }
      }
      return ankle;
    }

    // platform + heel, drawn flat to the ground so the stance reads
    const h = F.heel + inf * 0.5;
    if (h > 0.5) {
      if (!flat) {
        g.fillStyle(INK, A);
        g.fillRect(ankle.x - 7.5 - inf, ankle.y - 2, 22 + inf * 2, h + 4.5);
      }
      g.fillStyle(col(boot), A);
      g.fillRect(ankle.x - 6 - inf, ankle.y - 2, 19 + inf * 2, h + 2);
      g.fillStyle(col(shade(boot, -0.4)), A);
      g.fillRect(ankle.x - 6 - inf, ankle.y + h - 1, 19 + inf * 2, 3.5);
      if (!flat) {
        // stiletto block at the back
        g.fillStyle(shade(boot, -0.25), A);
        g.fillRect(ankle.x - 6, ankle.y + h * 0.4, 4.5, h * 0.9);
      }
    } else {
      g.fillStyle(col(boot), A);
      g.fillEllipse(ankle.x + 3, ankle.y + 2, 20 + inf * 2, 9 + inf);
    }
    return ankle;
  }

  /** Generic two-bone limb, used by the extra-arm flourish. */
  private limb(
    g: Phaser.GameObjects.Graphics, origin: Vec, angles: [number, number],
    len1: number, len2: number, thick: number, color: number, alpha: number,
    endColor: number, inflate: number, flat: boolean,
  ): Vec {
    const a1 = angles[0];
    const a2 = angles[0] + angles[1];
    const d1 = dir(a1);
    const joint = v(origin.x + d1.x * len1, origin.y + d1.y * len1);
    const d2 = dir(a2);
    const end = v(joint.x + d2.x * len2, joint.y + d2.y * len2);

    if (!flat && inflate === 0) {
      g.lineStyle(thick + 3.4, INK, Math.min(1, alpha));
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

  /* ---------------------------------------------------------------- *
   * body detail
   * ---------------------------------------------------------------- */

  private drawBust(
    g: Phaser.GameObjects.Graphics, chest: Vec, p: Pose, buW: number, A: number,
  ): void {
    const r = this.rig;
    const rad = buW * 0.52;
    for (const s of [-1, 1]) {
      const c = add(chest, rot(v(s * buW * 0.42, -2), p.spine));
      g.fillStyle(shade(r.outfit, 0.14), A);
      g.fillCircle(c.x, c.y, rad);
      g.lineStyle(2, shade(r.outfit, -0.35), A * 0.85);
      g.beginPath();
      g.arc(c.x, c.y, rad, 0.15 * Math.PI, 0.85 * Math.PI, false);
      g.strokePath();
    }
    // plunging neckline: bare chest between the cups
    if (this.costume.kind === 'leotard' || this.costume.kind === 'bodysuit') {
      const top = add(chest, rot(v(0, -rad * 1.15), p.spine));
      const bot = add(chest, rot(v(1, rad * 0.85), p.spine));
      g.fillStyle(r.skin, A);
      g.fillTriangle(
        top.x - rad * 0.62, top.y,
        top.x + rad * 0.62, top.y,
        bot.x, bot.y,
      );
      g.lineStyle(2, shade(r.outfit, 0.25), A * 0.7);
      g.lineBetween(top.x - rad * 0.62, top.y, bot.x, bot.y);
      g.lineBetween(top.x + rad * 0.62, top.y, bot.x, bot.y);
    }
    // highlight
    const hl = add(chest, rot(v(buW * 0.42, -rad * 0.5), p.spine));
    g.fillStyle(0xffffff, A * 0.22);
    g.fillCircle(hl.x, hl.y, rad * 0.32);
  }

  private drawCostume(
    g: Phaser.GameObjects.Graphics,
    n: { hip: Vec; waist: Vec; chest: Vec; shoulder: Vec },
    w: { shW: number; buW: number; waW: number; hiW: number },
    p: Pose, A: number,
  ): void {
    const r = this.rig;
    const c = this.costume;
    const at = (node: Vec, dx: number, dy = 0): Vec => add(node, rot(v(dx, dy), p.spine));

    if (c.kind === 'blazer') {
      // open jacket: two lapel panels down the sides over the leotard
      for (const s of [-1, 1]) {
        g.fillStyle(shade(r.outfitAlt, -0.05), A);
        g.beginPath();
        const a = at(n.shoulder, s * (w.shW + 1), -4);
        const b = at(n.shoulder, s * w.shW * 0.62, -4);
        const cc = at(n.chest, s * w.buW * 0.86, 2);
        const d = at(n.hip, s * w.hiW * 1.0, 4);
        g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(cc.x, cc.y); g.lineTo(d.x, d.y);
        g.closePath(); g.fillPath();
        g.lineStyle(2, INK, 0.8); g.strokePath();
        // lapel flash
        g.lineStyle(3, r.trim, A * 0.9);
        g.lineBetween(b.x, b.y, cc.x, cc.y);
      }
    } else if (c.kind === 'harness') {
      for (const s of [-1, 1]) {
        const a = at(n.shoulder, s * w.shW * 0.6, -2);
        const b = at(n.waist, -s * w.waW * 0.5, 0);
        g.lineStyle(5, r.trim, A * 0.95);
        g.lineBetween(a.x, a.y, b.x, b.y);
      }
    } else if (c.kind === 'leotard' || c.kind === 'bodysuit') {
      // high-cut leg line
      g.lineStyle(3, shade(r.outfit, -0.3), A * 0.8);
      const l = at(n.hip, -w.hiW * 0.9, -2);
      const m = at(n.waist, 0, 6);
      const rr = at(n.hip, w.hiW * 0.9, -2);
      g.beginPath(); g.moveTo(l.x, l.y); g.lineTo(m.x, m.y); g.lineTo(rr.x, rr.y); g.strokePath();
    }

    if (c.scalePanel !== undefined) {
      // reptile-scale plate inset from the torso edge
      const pts = [
        at(n.shoulder, -w.shW * 0.72, -2), at(n.shoulder, w.shW * 0.72, -2),
        at(n.chest, w.buW * 0.62, 0), at(n.waist, w.waW * 0.8, 0),
        at(n.hip, w.hiW * 0.7, 4), at(n.hip, -w.hiW * 0.7, 4),
        at(n.waist, -w.waW * 0.8, 0), at(n.chest, -w.buW * 0.62, 0),
      ];
      g.fillStyle(c.scalePanel, A);
      g.beginPath();
      g.moveTo(pts[0]!.x, pts[0]!.y);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i]!.x, pts[i]!.y);
      g.closePath();
      g.fillPath();
      // scale texture
      g.fillStyle(shade(c.scalePanel, -0.28), A * 0.6);
      for (let row = 0; row < 6; row++) {
        for (let colI = -2; colI <= 2; colI++) {
          const q = at(n.hip, colI * 5 + (row % 2) * 2.5, -6 - row * 7);
          g.fillCircle(q.x, q.y, 1.5);
        }
      }
    }
    if (c.bolt !== undefined) {
      const a1 = at(n.shoulder, -6, 2);
      const a2 = at(n.chest, 5, 0);
      const a3 = at(n.waist, -3, 0);
      const a4 = at(n.hip, 7, 2);
      g.lineStyle(7, c.bolt, A);
      g.beginPath();
      g.moveTo(a1.x, a1.y);
      g.lineTo(a2.x, a2.y);
      g.lineTo(a3.x, a3.y);
      g.lineTo(a4.x, a4.y);
      g.strokePath();
    }
    if (c.trunks !== undefined) {
      const l = at(n.hip, -w.hiW - 1, -6);
      g.fillStyle(c.trunks, A);
      g.fillRoundedRect(l.x, l.y, (w.hiW + 1) * 2, 17, 5);
      g.lineStyle(2, INK, A * 0.8);
      g.strokeRoundedRect(l.x, l.y, (w.hiW + 1) * 2, 17, 5);
      g.fillStyle(0xffffff, A * 0.16);
      g.fillRoundedRect(l.x + 3, l.y + 2, (w.hiW + 1) * 2 - 6, 5, 3);
    }
    if (c.collar !== undefined) {
      // shirt collar sitting on the shoulders, points turned down
      for (const side of [-1, 1]) {
        const a = at(n.shoulder, side * 8.5, -7);
        const b = at(n.shoulder, side * 1.5, -8);
        const cc = at(n.shoulder, side * 5, 2);
        g.fillStyle(c.collar, A);
        g.fillTriangle(a.x, a.y, b.x, b.y, cc.x, cc.y);
        g.lineStyle(1.8, INK, A * 0.8);
        g.strokeTriangle(a.x, a.y, b.x, b.y, cc.x, cc.y);
      }
    }
    if (c.tie !== undefined) {
      const knot = at(n.shoulder, 1, -4);
      const tip = at(n.chest, 3, 8);
      g.fillStyle(c.tie, A);
      g.fillTriangle(knot.x - 3.5, knot.y, knot.x + 3.5, knot.y, tip.x, tip.y);
      g.fillRect(knot.x - 3.5, knot.y - 4, 7, 5);
      g.lineStyle(1.6, INK, A * 0.7);
      g.strokeTriangle(knot.x - 3.5, knot.y, knot.x + 3.5, knot.y, tip.x, tip.y);
    }
    if (c.sashKnot !== undefined) {
      const k = at(n.hip, 2, 2);
      g.fillStyle(c.sashKnot, A);
      g.fillCircle(k.x, k.y, 5);
      g.fillTriangle(k.x - 1, k.y + 2, k.x + 7, k.y + 4, k.x + 2, k.y + 14);
      g.fillTriangle(k.x + 1, k.y + 2, k.x - 6, k.y + 5, k.x - 2, k.y + 13);
    }
    if (c.belt !== undefined) {
      const a = at(n.waist, -w.waW - 2, 2);
      const b = at(n.waist, w.waW + 2, 2);
      g.lineStyle(7, c.belt, A);
      g.lineBetween(a.x, a.y, b.x, b.y);
      const mid = at(n.waist, 0, 2);
      g.fillStyle(r.trim, A);
      g.fillCircle(mid.x, mid.y, 3.6);
    }
    if (c.fringe !== undefined) {
      for (let i = -3; i <= 3; i++) {
        const a = at(n.hip, (i / 3) * w.hiW, 6);
        g.lineStyle(2.2, c.fringe, A * 0.9);
        g.lineBetween(a.x, a.y, a.x + Math.sin(this.loopTime * 4 + i) * 2, a.y + 11);
      }
    }
  }

  /* ---------------------------------------------------------------- *
   * face + hair
   * ---------------------------------------------------------------- */

  private drawFace(g: Phaser.GameObjects.Graphics, h: Vec, p: Pose, A: number): void {
    const f = this.face;
    const ang = p.spine + p.head;
    const at = (dx: number, dy: number): Vec => add(h, rot(v(dx, dy), ang));

    if (f.kind === 'insect') {
      // compound eye + brow ridge
      const eye = at(6, -3);
      g.fillStyle(0x0d1a08, A);
      g.fillEllipse(eye.x, eye.y, 15, 13);
      g.fillStyle(f.shadow, A * 0.95);
      g.fillEllipse(eye.x, eye.y, 12.5, 10.5);
      g.fillStyle(0xffffff, A * 0.5);
      g.fillCircle(eye.x + 3, eye.y - 3, 2.6);
      for (let i = -1; i <= 1; i++) {
        g.lineStyle(1.2, 0x0d1a08, A * 0.6);
        g.lineBetween(eye.x - 6, eye.y + i * 3.2, eye.x + 6, eye.y + i * 3.2);
      }
      const back = at(-8, -2);
      g.fillStyle(0x0d1a08, A * 0.85);
      g.fillEllipse(back.x, back.y, 8, 7);
      return;
    }
    if (f.kind === 'maw') {
      // blue skull patches
      g.fillStyle(0x3f7fd0, A * 0.75);
      const patch = at(-4, -9);
      g.fillEllipse(patch.x, patch.y, 15, 9);
      // small eyes riding above the mouth
      for (const dx of [2, 11]) {
        const e = at(dx, -6);
        g.fillStyle(0xf7f2d8, A);
        g.fillEllipse(e.x, e.y, 6.5, 5.5);
        g.fillStyle(0x1b2410, A);
        g.fillCircle(e.x + 0.8, e.y, 2.1);
      }
      // the mouth: dark cavern, jagged teeth top and bottom, thick lips round it
      const m = at(5, 6);
      const mw = 30;
      const mh = 15;
      g.fillStyle(f.maw ?? 0x2a1420, A);
      g.fillEllipse(m.x, m.y, mw, mh);
      g.fillStyle(f.teeth ?? 0xf2e8c0, A);
      for (let i = 0; i < 6; i++) {
        const x = m.x - mw / 2 + 3 + i * (mw - 6) / 5;
        g.fillTriangle(x - 2.6, m.y - mh / 2 + 1, x + 2.6, m.y - mh / 2 + 1, x, m.y + 2.5);
        g.fillTriangle(x - 2.2, m.y + mh / 2 - 1, x + 2.2, m.y + mh / 2 - 1, x, m.y - 1.5);
      }
      g.lineStyle(5, f.lip, A);
      g.strokeEllipse(m.x, m.y, mw, mh);
      return;
    }
    if (f.kind === 'machine') {
      const bar = at(2, -2);
      g.fillStyle(f.shadow, A);
      g.fillRect(bar.x - 12, bar.y - 4, 22, 7);
      g.fillStyle(0xffffff, A * 0.8);
      g.fillRect(bar.x + 4, bar.y - 3, 4, 5);
      return;
    }

    // --- glam ---
    const eye = at(5.5, -2.5);
    // eyeshadow sweep
    g.fillStyle(f.shadow, A * 0.55);
    g.fillEllipse(eye.x - 0.5, eye.y - 3.5, 13, 7);
    // eye white + iris
    g.fillStyle(0xffffff, A);
    g.fillEllipse(eye.x, eye.y, 8.4, 6);
    g.fillStyle(0x1a1020, A);
    g.fillCircle(eye.x + 1.4, eye.y, 2.5);
    g.fillStyle(0xffffff, A * 0.9);
    g.fillCircle(eye.x + 2.4, eye.y - 1.2, 0.9);
    // lash line + flick
    g.lineStyle(2.6, f.lash, A);
    g.beginPath();
    g.arc(eye.x, eye.y, 4.6, Math.PI * 1.05, Math.PI * 1.95, false);
    g.strokePath();
    const flick = at(11, -5.5);
    g.lineStyle(2.4, f.lash, A);
    g.lineBetween(eye.x + 4, eye.y - 2.4, flick.x, flick.y);
    // brow
    g.lineStyle(2.4, f.brow, A);
    const b1 = at(1, -9);
    const b2 = at(9.5, -8);
    g.beginPath();
    g.moveTo(b1.x, b1.y);
    g.lineTo((b1.x + b2.x) / 2, (b1.y + b2.y) / 2 - 2.4);
    g.lineTo(b2.x, b2.y);
    g.strokePath();
    // lips
    const lip = at(9.5, 6.5);
    g.fillStyle(f.lip, A);
    g.fillEllipse(lip.x, lip.y, 9, 6);
    g.fillStyle(shade(f.lip, -0.35), A * 0.8);
    g.fillRect(lip.x - 4.5, lip.y - 0.5, 9, 1.2);
    g.fillStyle(0xffffff, A * 0.35);
    g.fillEllipse(lip.x + 1, lip.y - 1.8, 3.4, 1.4);
    // blush + contour
    const blush = at(4, 3.5);
    g.fillStyle(f.lip, A * 0.28);
    g.fillEllipse(blush.x, blush.y, 8, 5);
  }

  /** Hair mass behind the head. */
  private drawWigBack(
    g: Phaser.GameObjects.Graphics, h: Vec, p: Pose, wig: WigSpec,
    color: number, A: number, inf: number, flat: boolean,
  ): void {
    if (wig.style === 'none') return;
    const s = wig.volume;
    const ang = p.spine + p.head;
    const at = (dx: number, dy: number): Vec => add(h, rot(v(dx, dy), ang));
    const sway = Math.sin(this.loopTime * 2.2) * 2;

    g.fillStyle(color, A);
    switch (wig.style) {
      case 'bouffant': {
        const c = at(-3, -9 * s);
        g.fillEllipse(c.x, c.y, (40 + inf * 2) * s, (34 + inf * 2) * s);
        const b = at(-13 * s, 4 * s);
        g.fillEllipse(b.x, b.y, (26 + inf * 2) * s, (30 + inf * 2) * s);
        break;
      }
      case 'beehive': {
        const c = at(-2, -22 * s);
        g.fillEllipse(c.x, c.y, (26 + inf * 2) * s, (40 + inf * 2) * s);
        const c2 = at(-2, -4 * s);
        g.fillEllipse(c2.x, c2.y, (34 + inf * 2) * s, (26 + inf * 2) * s);
        break;
      }
      case 'longwaves': {
        const c = at(-4, -8 * s);
        g.fillEllipse(c.x, c.y, (34 + inf * 2) * s, (30 + inf * 2) * s);
        for (const side of [-1, 1]) {
          let cur = at(side * 11 * s, 2);
          for (let i = 0; i < 4; i++) {
            g.fillCircle(cur.x, cur.y, (9 - i * 0.9 + inf) * s);
            cur = v(cur.x + Math.sin(i * 1.6 + sway * 0.4) * 3 * side, cur.y + 11 * s);
          }
        }
        break;
      }
      case 'bob': {
        const c = at(-2, 0);
        g.fillEllipse(c.x, c.y, (32 + inf * 2) * s, (32 + inf * 2) * s);
        break;
      }
      case 'flipbob': {
        // tall crown, heavy sides, ends flicked outward
        if (wig.color2 !== undefined) {
          g.fillStyle(wig.color2, A);
          const u = at(-3, 4 * s);
          g.fillEllipse(u.x, u.y, (44 + inf * 2) * s, (36 + inf * 2) * s);
          g.fillStyle(color, A);
        }
        const crown = at(-2, -14 * s);
        g.fillEllipse(crown.x, crown.y, (46 + inf * 2) * s, (34 + inf * 2) * s);
        const mass = at(-3, 0);
        g.fillEllipse(mass.x, mass.y, (44 + inf * 2) * s, (32 + inf * 2) * s);
        // flicked ends at the jawline
        for (const side of [-1, 1]) {
          const tip = at(side * 19 * s, 12 * s);
          g.fillTriangle(
            tip.x, tip.y - 7 * s,
            tip.x + side * (7 + inf * 0.5) * s, tip.y + 3 * s,
            tip.x - side * 3, tip.y + 8 * s,
          );
        }
        break;
      }
      case 'ponytail': {
        const c = at(-4, -6 * s);
        g.fillEllipse(c.x, c.y, (28 + inf * 2) * s, (26 + inf * 2) * s);
        let cur = at(-14 * s, -4);
        for (let i = 0; i < 5; i++) {
          g.fillCircle(cur.x, cur.y, (8 - i + inf) * s);
          cur = v(cur.x - 6 * s, cur.y + 8 * s + Math.sin(i + sway) * 2);
        }
        break;
      }
      case 'mohawk': {
        for (let i = -2; i <= 2; i++) {
          const c = at(i * 5 * s, -14 * s - Math.abs(i) * -2);
          g.fillTriangle(
            c.x - 4 * s, c.y + 10 * s,
            c.x, c.y - (16 - Math.abs(i) * 3 + inf) * s,
            c.x + 4 * s, c.y + 10 * s,
          );
        }
        break;
      }
    }
    if (!flat && wig.color2 !== undefined) {
      const c = at(-6, -12 * s);
      g.fillStyle(wig.color2, A * 0.85);
      g.fillEllipse(c.x, c.y, 12 * s, 8 * s);
    }
  }

  /**
   * The hairline crescent. Drawn BEFORE the makeup, then the face oval is
   * punched back over it, so hair frames the face instead of covering it.
   */
  private drawWigCap(
    g: Phaser.GameObjects.Graphics, h: Vec, p: Pose, wig: WigSpec,
    color: number, A: number, inf: number, flat: boolean,
  ): void {
    if (wig.style === 'none' || wig.style === 'mohawk') return;
    const s = Math.min(1.2, wig.volume);
    const ang = p.spine + p.head;
    const at = (dx: number, dy: number): Vec => add(h, rot(v(dx, dy), ang));

    g.fillStyle(color, A);
    const cap = at(-2, -6);
    g.fillEllipse(cap.x, cap.y, (34 + inf * 2) * s, (30 + inf * 2) * s);
    if (!flat) {
      // punch the face back out so the hair reads as a frame
      g.fillStyle(this.rig.skin, A);
      const face = at(4, 0);
      g.fillEllipse(face.x, face.y, 26, 26);

      const fringeCol = wig.darkFringe && wig.color2 !== undefined ? wig.color2 : color;
      // choppy fringe falling over the forehead, kept above the brow line
      g.fillStyle(fringeCol, A);
      for (let i = 0; i < 4; i++) {
        const x = -9 + i * 6.5;
        const tip = at(x, -5 + (i % 2) * 2.5);
        const l = at(x - 4.5, -15);
        const r = at(x + 4.5, -15);
        g.fillTriangle(l.x, l.y, r.x, r.y, tip.x, tip.y);
      }
      if (wig.color2 !== undefined && !wig.darkFringe) {
        g.fillStyle(wig.color2, A * 0.8);
        const st = at(-8, -14);
        g.fillEllipse(st.x, st.y, 11 * s, 6 * s);
      }
    }
  }

  /** Side sweep falling past the cheek, drawn over the head. */
  private drawWigFront(
    g: Phaser.GameObjects.Graphics, h: Vec, p: Pose, wig: WigSpec,
    color: number, A: number, inf: number, flat: boolean,
  ): void {
    if (wig.style === 'none' || wig.style === 'mohawk') return;
    const s = wig.volume;
    const ang = p.spine + p.head;
    const at = (dx: number, dy: number): Vec => add(h, rot(v(dx, dy), ang));
    g.fillStyle(color, A);
    const sw = at(-15 * s, 2);
    g.fillEllipse(sw.x, sw.y, (12 + inf) * s, (28 + inf) * s);
    if (!flat) {
      g.lineStyle(1.6, shade(color, -0.28), A * 0.6);
      g.strokeEllipse(sw.x, sw.y, (12 + inf) * s, (28 + inf) * s);
    }
  }

  /* ---------------------------------------------------------------- *
   * flourishes
   * ---------------------------------------------------------------- */

  private drawBigHair(
    g: Phaser.GameObjects.Graphics, h: Vec, p: Pose, fl: Flourish,
    color: number, a: number, inf: number, flat: boolean,
  ): void {
    const s = (fl.scale ?? 1);
    const up = rot(v(0, -14 * s), p.spine + p.head);
    const c = add(h, up);
    g.fillStyle(color, a);
    g.fillCircle(c.x - 10 * s, c.y + 2, (11 + inf) * s);
    g.fillCircle(c.x + 9 * s, c.y + 1, (11 + inf) * s);
    g.fillCircle(c.x - 2 * s, c.y - 8 * s, (13 + inf) * s);
    g.fillCircle(c.x - 16 * s, c.y + 12 * s, (8 + inf) * s);
    g.fillCircle(c.x + 14 * s, c.y + 12 * s, (8 + inf) * s);
    if (!flat && fl.color2 !== undefined) {
      g.fillStyle(fl.color2, 0.9);
      g.fillCircle(c.x - 2 * s, c.y - 12 * s, 4 * s);
      g.fillCircle(c.x + 13 * s, c.y - 1 * s, 3 * s);
    }
  }

  private drawPads(
    g: Phaser.GameObjects.Graphics, sh: Vec, p: Pose, fl: Flourish,
    color: number, a: number, inf: number, flat: boolean,
  ): void {
    const s = fl.scale ?? 1;
    for (const side of [-1, 1]) {
      const c = add(sh, rot(v(side * 18 * s, 1), p.spine));
      g.fillStyle(color, a);
      g.beginPath();
      g.moveTo(c.x - (13 + inf) * s, c.y + (9 + inf) * s);
      g.lineTo(c.x - (5 + inf) * s, c.y - (13 + inf) * s);
      g.lineTo(c.x + (5 + inf) * s, c.y - (13 + inf) * s);
      g.lineTo(c.x + (13 + inf) * s, c.y + (9 + inf) * s);
      g.closePath();
      g.fillPath();
      if (!flat) {
        g.lineStyle(2.2, INK, 0.9);
        g.strokePath();
        if (fl.color2 !== undefined) {
          g.fillStyle(fl.color2, 0.95);
          g.fillRect(c.x - 8 * s, c.y - 4 * s, 16 * s, 3 * s);
        }
      }
    }
  }

  private drawCarapace(
    g: Phaser.GameObjects.Graphics, hip: Vec, sh: Vec, _p: Pose,
    fl: Flourish, color: number, a: number, inf: number,
  ): void {
    for (let i = 0; i < 4; i++) {
      const t = 0.14 + i * 0.24;
      const c = v(hip.x + (sh.x - hip.x) * t, hip.y + (sh.y - hip.y) * t);
      const w = (18 - i * 2.4) + inf;
      g.fillStyle(i % 2 === 0 ? color : (fl.color2 ?? color), a * 0.95);
      g.fillEllipse(c.x, c.y, w * 2, 10 + inf);
    }
  }

  private drawSash(
    g: Phaser.GameObjects.Graphics, hip: Vec, sh: Vec, p: Pose, color: number, a: number,
  ): void {
    const p1 = add(sh, rot(v(-13, 0), p.spine));
    const p2 = add(hip, rot(v(13, 4), p.spine));
    g.lineStyle(8, color, a * 0.95);
    g.lineBetween(p1.x, p1.y, p2.x, p2.y);
  }

  private drawAntennae(
    g: Phaser.GameObjects.Graphics, h: Vec, p: Pose, fl: Flourish,
    color: number, a: number, inf: number,
  ): void {
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

  private drawMandibles(
    g: Phaser.GameObjects.Graphics, h: Vec, p: Pose, color: number, a: number, inf: number,
  ): void {
    for (const side of [-1, 1]) {
      const base = add(h, rot(v(11, side * 4), p.spine + p.head));
      const tip = add(base, rot(v(10, side * 8), p.spine + p.head));
      g.lineStyle(3.4 + inf, color, a);
      g.lineBetween(base.x, base.y, tip.x, tip.y);
    }
  }

  private drawVisor(
    g: Phaser.GameObjects.Graphics, h: Vec, p: Pose, color: number, a: number,
  ): void {
    const c = add(h, rot(v(2, -2), p.spine + p.head));
    g.fillStyle(color, a * 0.95);
    g.fillRect(c.x - 12, c.y - 4, 22, 7);
  }

  private drawCrown(
    g: Phaser.GameObjects.Graphics, h: Vec, p: Pose, fl: Flourish,
    color: number, a: number, inf: number,
  ): void {
    const c = add(h, rot(v(0, -15), p.spine + p.head));
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

  /** Fan of soft spines sweeping back off the skull. */
  private drawCrest(
    g: Phaser.GameObjects.Graphics, h: Vec, p: Pose, fl: Flourish,
    color: number, a: number, inf: number,
  ): void {
    const n = fl.count ?? 7;
    const s = fl.scale ?? 1;
    const ang = p.spine + p.head;
    const sway = Math.sin(this.loopTime * 2.6) * 3;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      // fan from above the brow round to the back of the skull
      const a0 = 168 + t * 104 + sway;
      const d0 = dir(a0);
      const base = add(h, rot(v(d0.x * 12, d0.y * 12), ang));
      const len = (14 + Math.sin(t * Math.PI) * 10 + inf) * s;
      const tip = add(base, rot(v(d0.x * len, d0.y * len), ang));
      g.lineStyle((5.5 + inf) * s, color, a);
      g.lineBetween(base.x, base.y, tip.x, tip.y);
      g.fillStyle(fl.color2 ?? color, a);
      g.fillCircle(tip.x, tip.y, (2.6 + inf * 0.5) * s);
    }
  }

  private drawWings(
    g: Phaser.GameObjects.Graphics, c: Vec, fl: Flourish, color: number, a: number, inf: number,
  ): void {
    const flap = Math.sin(this.loopTime * 9) * 8;
    for (const side of [-1, 1]) {
      g.fillStyle(color, a * 0.45);
      g.fillEllipse(c.x - 12, c.y - 6 + side * 4 + flap * side * 0.4, 42 + inf, 16 + inf);
    }
    void fl;
  }

  private drawTail(
    g: Phaser.GameObjects.Graphics, hip: Vec, fl: Flourish, color: number, a: number, inf: number,
  ): void {
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

  /* ---------------------------------------------------------------- *
   * prop + tells
   * ---------------------------------------------------------------- */

  private drawProp(
    g: Phaser.GameObjects.Graphics, hand: Vec, angle: number, a: number,
  ): void {
    const prop = this.cfg.prop!;
    const A = angle * D;
    const push = (x: number, y: number): Vec => v(
      hand.x + x * Math.cos(A) - y * Math.sin(A),
      hand.y + x * Math.sin(A) + y * Math.cos(A),
    );
    g.lineStyle(2.2, INK, 0.9);
    switch (prop.shape) {
      case 'briefcase': {
        const c = push(0, 12);
        g.fillStyle(prop.color, a);
        g.fillRect(c.x - 15, c.y - 10, 30, 21);
        g.strokeRect(c.x - 15, c.y - 10, 30, 21);
        g.fillStyle(prop.color2 ?? INK, a);
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
      case 'brickphone': {
        // chunky 1980s handset: body, keypad, aerial
        const c = push(0, 12);
        g.fillStyle(prop.color, a);
        g.fillRect(c.x - 7, c.y - 16, 15, 32);
        g.strokeRect(c.x - 7, c.y - 16, 15, 32);
        g.fillStyle(prop.color2 ?? 0x2a2018, a);
        g.fillRect(c.x - 4.5, c.y - 6, 10, 15);
        g.fillStyle(shade(prop.color, 0.4), a);
        g.fillRect(c.x - 4.5, c.y - 13, 10, 5);
        g.lineStyle(3, prop.color2 ?? 0x2a2018, a);
        g.lineBetween(c.x + 4, c.y - 16, c.x + 7, c.y - 30);
        g.fillStyle(prop.color, a);
        g.fillCircle(c.x + 7, c.y - 31, 2.6);
        g.lineStyle(2.2, INK, 0.9);
        break;
      }
      case 'sign': {
        const c = push(0, 14);
        g.fillStyle(prop.color2 ?? INK, a);
        g.fillRect(c.x - 2, c.y - 4, 4, 24);
        g.fillStyle(prop.color, a);
        g.fillRect(c.x - 16, c.y - 20, 32, 18);
        g.strokeRect(c.x - 16, c.y - 20, 32, 18);
        break;
      }
    }
  }

  private drawChargeTell(ratio: number, p: Pose): void {
    const c = v(0, -78 * p.crouch);
    const g = this.fxLayer;
    g.lineStyle(3, 0xffffff, 0.25 + ratio * 0.5);
    g.strokeCircle(c.x, c.y, 36 + (1 - ratio) * 26);
    g.lineStyle(5, this.rig.aura, 0.35 + ratio * 0.6);
    g.beginPath();
    g.arc(c.x, c.y, 36, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio, false);
    g.strokePath();
  }

  private drawGuard(p: Pose, blockAge: number): void {
    const g = this.fxLayer;
    const fresh = blockAge <= TUNING.combat.reversalWindow;
    const c = v(4, -64 * p.crouch);
    g.lineStyle(fresh ? 4 : 2.2, fresh ? 0xffffff : 0x8fa6c9, fresh ? 0.85 : 0.4);
    g.strokeCircle(c.x, c.y, 32);
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
