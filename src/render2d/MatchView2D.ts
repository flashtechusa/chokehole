import type { Fighter } from '@/game/combat/Fighter';
import type { MatchSim, SimEvent } from '@/game/combat/MatchSim';
import type { HitReport } from '@/game/combat/CombatResolver';
import { FS } from '@/game/combat/states';
import { TUNING } from '@/game/config/tuning';
import { C } from '@/game/config/canon';
import { clamp } from '@/game/util/math';
import { hitPower } from '@/game/config/impacts';
import { STYLE_BRUTE, STYLE_POISED } from '@/anim/clips';
import { Arena2D, RING_MAT_Y } from './Arena2D';
import { Rig2D } from './Rig2D';
import { drawFigure } from './Figure';
import { JASSY_2D, RAID_2D } from './art';
import { dotPattern, type Ctx } from './Paint';
import { FX2D } from './FX2D';
import type { Stage2D } from './Engine2D';

interface Side { fighter: Fighter; rig: Rig2D }

/** Where the mat sits down the frame. Everything else hangs off this. */
const MAT_FRAC = 0.72;

/**
 * Draws a MatchSim, flat.
 *
 * Same contract the 3D view had -- handleEvents, update, project -- because the
 * simulation never knew about either of them. The camera is two numbers now:
 * where to centre and how far to zoom out, both driven by where the wrestlers
 * are, with a punch on impact.
 */
export class MatchView2D {
  readonly fx: FX2D;
  private arena = new Arena2D();
  private sides: [Side, Side];
  private dots: CanvasPattern | null = null;
  private dotsQuality: string | null = null;

  /** Camera, in world units. */
  private camX = 0;
  private camScale = 1;
  private punch = 0;
  private shake = 0;
  private reduceShake = false;
  private heat = 0;

  constructor(private stage: Stage2D, private sim: MatchSim) {
    this.fx = new FX2D();
    this.sides = [
      { fighter: sim.p1, rig: new Rig2D(JASSY_2D, STYLE_POISED) },
      { fighter: sim.p2, rig: new Rig2D(RAID_2D, STYLE_BRUTE) },
    ];
  }

  applyQuality(): void { this.dotsQuality = null; }
  setReducedFx(reduceFlash: boolean, reduceShake: boolean): void {
    this.fx.setReduceFlash(reduceFlash);
    this.reduceShake = reduceShake;
  }
  dispose(): void { /* nothing retained outside the canvas */ }

  /* ------------------------------------------------------------------ */

  handleEvents(events: SimEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case 'hit': this.onHit(e.report); break;
        case 'reversal':
          this.punchCamera(0.95);
          this.fx.burst(e.by.x, e.by.y + 0.9, 0.9, e.by.cfg.accent);
          break;
        case 'squelshTaken':
          this.sideOf(e.who).rig.setTint(e.who.cfg.squelsh.tint);
          this.fx.burst(e.who.x, e.who.y + 1.2, 0.8, e.who.cfg.squelsh.tint);
          break;
        case 'pinEscape':
          if (e.nearFall) {
            this.punchCamera(1.5);
            this.fx.confetti((this.sim.pinned ?? this.sim.p1).x, 26);
          }
          break;
        case 'finish': {
          const w = e.result.playerWon ? this.sim.p1 : this.sim.p2;
          this.fx.confetti(w.x, 90);
          break;
        }
        case 'spot': this.punchCamera(e.kind === 'finisher' ? 1.6 : 0.9); break;
        case 'fighter':
          if (e.event.type === 'rebound' || e.event.type === 'getUp') {
            this.fx.dust(e.who.x, 0.3);
          }
          break;
      }
    }
  }

  private onHit(r: HitReport): void {
    const power = hitPower(r.move);
    this.fx.burst(r.x, r.y + 0.5, power, r.attacker.cfg.accent);
    this.punchCamera((r.move.cameraPunch ?? 0.3) + power * 0.6);
    this.sideOf(r.defender).rig.setFlash(1);
    if (r.move.knockdown) this.fx.dust(r.defender.x, power);
  }

  private punchCamera(v: number): void {
    this.punch = Math.max(this.punch, v);
    if (!this.reduceShake) this.shake = Math.max(this.shake, v);
  }

  private sideOf(f: Fighter): Side {
    return this.sides[0].fighter === f ? this.sides[0] : this.sides[1];
  }

  /* ------------------------------------------------------------------ */

  update(dt: number): void {
    const g = this.stage.ctx;
    const pre = this.stage.preset;
    if (this.dotsQuality !== this.stage.quality) {
      this.dots = pre.halftone ? dotPattern(g, 'rgba(18,10,24,0.45)', 6, 1.3) : null;
      this.dotsQuality = this.stage.quality;
    }

    this.heat += (this.sim.heat.frac - this.heat) * Math.min(1, dt / 400);
    this.arena.update(dt);
    this.fx.update(dt);
    this.punch = Math.max(0, this.punch - dt / 260);
    this.shake = Math.max(0, this.shake - dt / 200);

    for (const s of this.sides) {
      this.pickClip(s);
      s.rig.update(dt);
    }

    /*
     * Camera. The midpoint decides where, the separation decides how far out,
     * and both are damped so a rope run does not whip the frame around.
     */
    const a = this.sides[0].fighter;
    const b = this.sides[1].fighter;
    const mid = (a.x + b.x) / 2;
    const sep = Math.abs(a.x - b.x);
    /*
     * Barely any pan. The screen already shows about eleven world units and the
     * ring is six and a half wide, so the whole thing fits -- panning to follow
     * the midpoint only slid the ring off to one side and pushed whoever was
     * near a rope out of frame.
     */
    const wantX = clamp(mid * 0.32, -1.1, 1.1);
    this.camX += (wantX - this.camX) * Math.min(1, dt / 260);
    const want = 1 / (1 + Math.max(0, sep - 2.2) * 0.075);
    this.camScale += (want - this.camScale) * Math.min(1, dt / 320);

    this.draw(g, dt);
  }

  private draw(g: Ctx, dt: number): void {
    void dt;
    const W = this.stage.width;
    const H = this.stage.height;
    const pre = this.stage.preset;

    g.save();
    g.fillStyle = '#140B1C';
    g.fillRect(0, 0, W, H);

    /*
     * World to screen. One transform, set once: +Y up, the mat a fixed
     * fraction down the frame, and a scale that keeps a wrestler a little under
     * half the screen's height at rest.
     */
    /*
     * Framed on the RING, not on the two bodies. A wrestler comes out a bit
     * over a third of the screen high, which puts their head clear of the HUD's
     * top quarter and the ring's own width inside the frame -- so you can see
     * the thing you are fighting inside.
     */
    const base = (H * 0.33) / 1.95;
    const S = base * this.camScale * (1 + this.punch * 0.035);
    const shakeX = this.shake * 5 * Math.sin(performance.now() / 11);
    const shakeY = this.shake * 4 * Math.sin(performance.now() / 7 + 1.3);
    g.translate(W / 2 + shakeX, H * MAT_FRAC + shakeY);
    g.scale(S, -S);
    g.translate(-this.camX, -RING_MAT_Y);

    const ink = pre.ink / S;
    this.arena.drawBack(g, ink, this.heat, this.dots);
    this.arena.drawMat(g, ink, this.dots);

    // Far fighter first, so the nearer one overlaps.
    const order = this.sides[0].fighter.x <= this.sides[1].fighter.x
      ? [this.sides[1], this.sides[0]] : [this.sides[0], this.sides[1]];
    for (const s of order) this.drawFighter(g, s, ink);

    this.fx.draw(g, ink, pre.maxShards);
    this.arena.drawFront(g, ink, this.dots);
    g.restore();
  }

  private drawFighter(g: Ctx, s: Side, ink: number): void {
    const f = s.fighter;
    const face = Math.cos(f.facing) >= 0 ? 1 : -1;
    g.save();
    g.translate(f.x, f.y);
    g.scale(face, 1);
    drawFigure(g, s.rig.fig, s.rig.solution, ink, this.dots);
    if (s.rig.flash > 0) {
      // The hit flash is a flat wash, because everything here is flat.
      g.save();
      g.globalAlpha = Math.min(0.75, s.rig.flash * 0.75);
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = C.bone;
      g.fillRect(-1, -0.2, 2, 2.6);
      g.restore();
    }
    g.restore();
  }

  /** A world point as a fraction of the canvas, for the DOM comic layer. */
  project(x: number, y: number): { x: number; y: number } | null {
    const W = this.stage.width;
    const H = this.stage.height;
    const base = (H * 0.33) / 1.95;
    const S = base * this.camScale * (1 + this.punch * 0.035);
    const sx = W / 2 + (x - this.camX) * S;
    const sy = H * MAT_FRAC - (y - RING_MAT_Y) * S;
    return { x: sx / W, y: sy / H };
  }

  /* ------------------------------------------------------------------ */

  private pickClip(side: Side): void {
    const f = side.fighter;
    const rig = side.rig;

    if (f.pairClip) { rig.scrub(f.pairClip, f.pairProgress); return; }

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
        rig.scrub(t?.clip ?? 'tauntShort', clamp(f.stateTime / (t?.durationMs ?? 900), 0, 1));
        return;
      }
      case FS.WIN: rig.play('victory', { speed: 1 }); return;
      case FS.LOSE: rig.play('defeat', { speed: 1 }); return;
      case FS.RUN: {
        const sp = clamp(Math.abs(f.vx) / (f.cfg.stats.speed * TUNING.move.run), 0.5, 1.6);
        rig.play('run', { speed: sp });
        return;
      }
      case FS.WALK: {
        const sp = clamp(Math.abs(f.vx) / (f.cfg.stats.speed * TUNING.move.walk), 0.45, 1.5);
        rig.play('walk', { speed: sp });
        return;
      }
      default: rig.play('idle', { speed: 1 });
    }
  }
}
