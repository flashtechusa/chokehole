import Phaser from 'phaser';
import { C, FONT } from '@/game/config/palette';
import { TUNING } from '@/game/config/tuning';

const W = TUNING.view.width;
const H = TUNING.view.height;

interface Particle {
  g: Phaser.GameObjects.Graphics;
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number; color: number;
  kind: 'spark' | 'confetti' | 'slime';
  rot: number; vrot: number;
}

/**
 * Impact frames, sparks, confetti, camera flashes and the corrupted-broadcast
 * overlay. Everything is pooled — no allocation during a match.
 */
export class FX {
  private scene: Phaser.Scene;
  private pool: Particle[] = [];
  private active: Particle[] = [];
  private impact: Phaser.GameObjects.Graphics;
  private flash: Phaser.GameObjects.Graphics;
  private crt: Phaser.GameObjects.Graphics;
  private callouts: Phaser.GameObjects.Text[] = [];
  private impactT = 0;
  private impactColor = 0xffffff;
  private impactX = 0;
  private impactY = 0;
  private impactScale = 1;
  private flashT = 0;
  private t = 0;
  private reduceFlash = false;
  private reduceShake = false;
  /** Set by MatchScene so late-created callouts are excluded from the UI camera. */
  private uiCam: Phaser.Cameras.Scene2D.Camera | null = null;

  /** Rendered by the world camera (moves/zooms with the action). */
  readonly worldObjects: Phaser.GameObjects.GameObject[] = [];
  /** Rendered by the fixed UI camera (never zooms). */
  readonly uiObjects: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene, poolSize = 90) {
    this.scene = scene;
    this.impact = scene.add.graphics().setDepth(520);
    this.flash = scene.add.graphics().setDepth(560).setScrollFactor(0);
    this.crt = scene.add.graphics().setDepth(570).setScrollFactor(0);
    this.worldObjects.push(this.impact);
    this.uiObjects.push(this.flash, this.crt);
    for (let i = 0; i < poolSize; i++) {
      const g = scene.add.graphics().setDepth(510).setVisible(false);
      this.worldObjects.push(g);
      this.pool.push({
        g, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1,
        size: 4, color: 0xffffff, kind: 'spark', rot: 0, vrot: 0,
      });
    }
  }

  /** Callouts are created mid-match, so the UI camera has to be told to skip them. */
  setUiCamera(cam: Phaser.Cameras.Scene2D.Camera): void {
    this.uiCam = cam;
  }

  setAccessibility(reduceFlash: boolean, reduceShake: boolean): void {
    this.reduceFlash = reduceFlash;
    this.reduceShake = reduceShake;
  }

  private take(): Particle | null {
    const p = this.pool.pop();
    if (!p) return null;
    this.active.push(p);
    p.g.setVisible(true);
    return p;
  }

  /* ---------------------------- bursts ---------------------------- */

  hit(x: number, y: number, color: number, power: number): void {
    const n = Math.min(16, 5 + Math.floor(power * 10));
    for (let i = 0; i < n; i++) {
      const p = this.take();
      if (!p) break;
      const a = Math.random() * Math.PI * 2;
      const s = 90 + Math.random() * 320 * power;
      p.kind = 'spark';
      p.x = x; p.y = y;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s - 60;
      p.maxLife = 0.26 + Math.random() * 0.28;
      p.life = p.maxLife;
      p.size = 3 + Math.random() * 5 * power;
      p.color = Math.random() > 0.4 ? color : 0xffffff;
      p.rot = 0; p.vrot = 0;
    }
    this.impactT = 1;
    this.impactColor = color;
    this.impactX = x;
    this.impactY = y;
    this.impactScale = 0.7 + power * 0.9;
  }

  slime(x: number, y: number, color: number, n = 10): void {
    for (let i = 0; i < n; i++) {
      const p = this.take();
      if (!p) break;
      p.kind = 'slime';
      p.x = x; p.y = y;
      p.vx = (Math.random() - 0.5) * 260;
      p.vy = -120 - Math.random() * 220;
      p.maxLife = 0.6 + Math.random() * 0.5;
      p.life = p.maxLife;
      p.size = 4 + Math.random() * 7;
      p.color = color;
      p.rot = 0; p.vrot = 0;
    }
  }

  confetti(cx: number, n = 46): void {
    const cols = [C.pink, C.acid, C.gold, C.cyan, C.orange, 0xffffff];
    for (let i = 0; i < n; i++) {
      const p = this.take();
      if (!p) break;
      p.kind = 'confetti';
      p.x = cx + (Math.random() - 0.5) * 460;
      p.y = -20 - Math.random() * 120;
      p.vx = (Math.random() - 0.5) * 130;
      p.vy = 90 + Math.random() * 150;
      p.maxLife = 2.4 + Math.random() * 1.4;
      p.life = p.maxLife;
      p.size = 5 + Math.random() * 7;
      p.color = cols[Math.floor(Math.random() * cols.length)]!;
      p.rot = Math.random() * 6.28;
      p.vrot = (Math.random() - 0.5) * 14;
    }
  }

  /* ---------------------------- text ------------------------------ */

  callout(text: string, x: number, y: number, color: number, big = false): void {
    const t = this.scene.add.text(x, y, text, {
      fontFamily: FONT.slam,
      fontSize: big ? '40px' : '22px',
      color: `#${color.toString(16).padStart(6, '0')}`,
      stroke: '#120a1a',
      strokeThickness: big ? 8 : 5,
    }).setOrigin(0.5).setDepth(540).setAngle(-4 + Math.random() * 8);
    this.uiCam?.ignore(t);
    this.callouts.push(t);
    this.scene.tweens.add({
      targets: t,
      y: y - (big ? 54 : 34),
      scaleX: { from: big ? 1.7 : 1.35, to: 1 },
      scaleY: { from: big ? 1.7 : 1.35, to: 1 },
      alpha: { from: 1, to: 0 },
      duration: big ? 1200 : 760,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        const i = this.callouts.indexOf(t);
        if (i >= 0) this.callouts.splice(i, 1);
        t.destroy();
      },
    });
  }

  /* ---------------------------- screen ---------------------------- */

  cameraFlash(intensity = 0.5): void {
    if (this.reduceFlash) return;
    this.flashT = Math.max(this.flashT, intensity);
  }

  shake(cam: Phaser.Cameras.Scene2D.Camera, amount: number, ms = 160): void {
    if (this.reduceShake) return;
    cam.shake(ms, amount);
  }

  /* ---------------------------- update ---------------------------- */

  update(dtMs: number, heat01: number, corrupt: number): void {
    const dt = dtMs / 1000;
    this.t += dt;

    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i]!;
      p.life -= dt;
      if (p.life <= 0) {
        p.g.setVisible(false).clear();
        this.active.splice(i, 1);
        this.pool.push(p);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;
      if (p.kind === 'spark') { p.vy += 900 * dt; p.vx *= 0.965; }
      else if (p.kind === 'slime') { p.vy += 1250 * dt; }
      else { p.vy += 40 * dt; p.vx += Math.sin(this.t * 3 + p.x * 0.02) * 22 * dt; }

      const k = p.life / p.maxLife;
      p.g.clear();
      p.g.setAlpha(Math.min(1, k * 1.6));
      if (p.kind === 'confetti') {
        p.g.fillStyle(p.color, 1);
        const w = p.size;
        const h = p.size * (0.45 + 0.5 * Math.abs(Math.sin(p.rot)));
        p.g.fillRect(p.x - w / 2, p.y - h / 2, w, h);
      } else if (p.kind === 'slime') {
        p.g.fillStyle(p.color, 0.85);
        p.g.fillCircle(p.x, p.y, p.size * (0.5 + k * 0.7));
      } else {
        p.g.fillStyle(p.color, 1);
        const s = p.size * k;
        p.g.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      }
    }

    // impact frame
    this.impact.clear();
    if (this.impactT > 0) {
      this.impactT = Math.max(0, this.impactT - dt * 7);
      const k = this.impactT;
      const r = (1 - k) * 62 * this.impactScale + 8;
      this.impact.lineStyle(9 * k * this.impactScale, this.impactColor, k);
      this.impact.strokeCircle(this.impactX, this.impactY, r);
      this.impact.lineStyle(3 * k, 0xffffff, k * 0.9);
      const spikes = 7;
      for (let i = 0; i < spikes; i++) {
        const a = (i / spikes) * Math.PI * 2 + this.impactScale;
        this.impact.lineBetween(
          this.impactX + Math.cos(a) * r * 0.8,
          this.impactY + Math.sin(a) * r * 0.8,
          this.impactX + Math.cos(a) * (r * 1.6 + 14 * k),
          this.impactY + Math.sin(a) * (r * 1.6 + 14 * k),
        );
      }
    }

    // camera flash
    this.flash.clear();
    if (this.flashT > 0) {
      this.flashT = Math.max(0, this.flashT - dt * 3.4);
      this.flash.fillStyle(0xffffff, this.flashT * 0.55);
      this.flash.fillRect(0, 0, W, H);
    }

    // broadcast corruption overlay
    this.crt.clear();
    if (!this.reduceFlash) {
      const base = 0.05 + heat01 * 0.05;
      this.crt.fillStyle(0x000000, base * 0.7);
      for (let y = 0; y < H; y += 4) this.crt.fillRect(0, y, W, 1);
      const roll = (this.t * 90) % (H + 120) - 60;
      this.crt.fillStyle(0xffffff, 0.03 + heat01 * 0.02);
      this.crt.fillRect(0, roll, W, 26);
      if (corrupt > 0) {
        for (let i = 0; i < 8 * corrupt; i++) {
          const y = Math.random() * H;
          const h = 2 + Math.random() * 12;
          this.crt.fillStyle(Math.random() > 0.5 ? C.pink : C.cyan, 0.16 + Math.random() * 0.3);
          this.crt.fillRect((Math.random() - 0.5) * 60, y, W + 60, h);
        }
      }
    }
  }

  clear(): void {
    for (const p of this.active) { p.g.setVisible(false).clear(); this.pool.push(p); }
    this.active.length = 0;
    for (const t of this.callouts) t.destroy();
    this.callouts.length = 0;
    this.impactT = 0;
    this.flashT = 0;
  }
}
