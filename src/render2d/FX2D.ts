import { C } from '@/game/config/canon';
import { Rng } from '@/game/util/rng';
import { Layer, ellipse, poly, slab, starburst, type Ctx } from './Paint';

interface Shard { x: number; y: number; vx: number; vy: number; s: number; life: number; max: number; tone: string }
interface Burst { x: number; y: number; life: number; max: number; s: number; tone: string; spin: number }

/**
 * Impact effects, flat. Starbursts and paper debris -- the same vocabulary as
 * the deck, which is a collage and never had a particle in it.
 */
export class FX2D {
  private rng = new Rng(0x5eed42);
  private shards: Shard[] = [];
  private bursts: Burst[] = [];
  private reduceFlash = false;

  setReduceFlash(v: boolean): void { this.reduceFlash = v; }

  burst(x: number, y: number, power: number, tone: string): void {
    if (!this.reduceFlash) {
      this.bursts.push({
        x, y, life: 0, max: 260 + power * 200,
        s: 0.35 + power * 0.55, tone, spin: this.rng.range(-0.5, 0.5),
      });
    }
    const n = Math.round(4 + power * 7);
    for (let i = 0; i < n; i++) {
      const a = this.rng.range(0, Math.PI * 2);
      this.shards.push({
        x, y,
        vx: Math.cos(a) * this.rng.range(1.2, 4) * (0.5 + power),
        vy: Math.abs(Math.sin(a)) * this.rng.range(1.5, 4.5) * (0.5 + power),
        s: this.rng.range(0.035, 0.085),
        life: 0, max: this.rng.range(280, 620),
        tone: this.rng.next() < 0.5 ? tone : C.bone,
      });
    }
  }

  dust(x: number, power: number): void {
    for (let i = 0; i < Math.round(4 + power * 6); i++) {
      this.shards.push({
        x: x + this.rng.range(-0.3, 0.3), y: 1.16,
        vx: this.rng.range(-2.2, 2.2), vy: this.rng.range(0.4, 2.2),
        s: this.rng.range(0.03, 0.07), life: 0, max: this.rng.range(260, 520),
        tone: '#E8DCC6',
      });
    }
  }

  confetti(x: number, count: number): void {
    const tones = [C.pink, C.squelsh, C.acid, C.blue, C.bone];
    for (let i = 0; i < count; i++) {
      this.shards.push({
        x: x + this.rng.range(-2, 2), y: 3.6 + this.rng.range(0, 1.4),
        vx: this.rng.range(-1, 1), vy: this.rng.range(-0.4, 0.8),
        s: this.rng.range(0.04, 0.09), life: 0, max: this.rng.range(1400, 2400),
        tone: tones[Math.floor(this.rng.next() * tones.length)]!,
      });
    }
  }

  update(dt: number): void {
    const s = dt / 1000;
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const sh = this.shards[i]!;
      sh.life += dt;
      sh.vy -= 11 * s;
      sh.x += sh.vx * s;
      sh.y += sh.vy * s;
      if (sh.life >= sh.max || sh.y < 0.9) this.shards.splice(i, 1);
    }
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i]!;
      b.life += dt;
      if (b.life >= b.max) this.bursts.splice(i, 1);
    }
  }

  draw(g: Ctx, ink: number, cap: number): void {
    const lay = new Layer(C.ink, ink);
    let n = 0;
    for (const b of this.bursts) {
      const f = b.life / b.max;
      const grow = f < 0.2 ? f / 0.2 : 1 + (f - 0.2) * 0.2;
      const k = b.s * grow;
      lay.add(starburst(b.x, b.y, k, k * 0.58, 11, b.spin), b.tone);
      lay.add(starburst(b.x, b.y, k * 0.62, k * 0.34, 11, b.spin + 0.3), C.bone, { noInk: true });
    }
    for (const sh of this.shards) {
      if (n++ > cap) break;
      lay.add(slab(sh.x, sh.y, sh.s, sh.s * 0.7, 0.01, sh.life / 90), sh.tone, { noInk: true });
    }
    lay.flush(g, null);
    void ellipse; void poly;
  }
}
