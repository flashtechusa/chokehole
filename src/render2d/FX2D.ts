import { C } from '@/game/config/canon';
import { Rng } from '@/game/util/rng';
import { Layer, ellipse, poly, slab, starburst, type Ctx } from './Paint';

interface Shard { x: number; y: number; vx: number; vy: number; s: number; life: number; max: number; tone: string }
interface Burst { x: number; y: number; life: number; max: number; s: number; tone: string; spin: number }
interface Streamer { x: number; y: number; vx: number; vy: number; life: number; max: number; tone: string; phase: number; spin: number }
interface PhoneFx { x: number; y: number; life: number; max: number; dir: number }
interface NoticeFx { x: number; y: number; life: number; max: number; dir: number }
interface BottleFx { x: number; y: number; life: number; max: number; dir: number }

/**
 * Impact effects, flat. Starbursts and paper debris -- the same vocabulary as
 * the deck, which is a collage and never had a particle in it.
 *
 * Performer-specific gags live here too. The giant phone, eviction notice,
 * Silly String and insecticide bottle are all rooted in documented CHOKE HOLE
 * performance imagery. Their game timing/choreography is an adaptation, not a
 * claim that these exact animations happened on stage.
 */
export class FX2D {
  private rng = new Rng(0x5eed42);
  private shards: Shard[] = [];
  private bursts: Burst[] = [];
  private streamers: Streamer[] = [];
  private phones: PhoneFx[] = [];
  private notices: NoticeFx[] = [];
  private bottles: BottleFx[] = [];
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

  /** RAID's documented Silly String gag. */
  sillyString(x: number, y: number, dir: number, count = 34): void {
    const tones = [C.pink, C.acid, C.squelsh, C.blue, C.bone];
    for (let i = 0; i < count; i++) {
      this.streamers.push({
        x: x + this.rng.range(-0.08, 0.08),
        y: y + this.rng.range(-0.15, 0.18),
        vx: dir * this.rng.range(3.8, 7.8),
        vy: this.rng.range(-0.35, 0.9),
        life: -this.rng.range(0, 180),
        max: this.rng.range(680, 1180),
        tone: tones[Math.floor(this.rng.next() * tones.length)]!,
        phase: this.rng.range(0, Math.PI * 2),
        spin: this.rng.range(-1.2, 1.2),
      });
    }
  }

  /** Jassy's documented jumbo telephone, adapted into a squash gag. */
  giantPhone(x: number, y: number, dir = 1): void {
    this.phones.push({ x, y, dir, life: 0, max: 1250 });
    this.burst(x, y + 0.18, 1.65, '#E8B33A');
  }

  /** Jassy's giant eviction notice spot, adapted into a paper-board collision. */
  evictionNotice(x: number, y: number, dir = 1): void {
    this.notices.push({ x, y, dir, life: 0, max: 1050 });
    this.burst(x, y + 0.72, 1.25, C.pink);
    for (let i = 0; i < 24; i++) {
      this.shards.push({
        x: x + this.rng.range(-0.7, 0.7), y: y + this.rng.range(0.25, 1.25),
        vx: this.rng.range(-2.8, 2.8), vy: this.rng.range(1.0, 4.0),
        s: this.rng.range(0.035, 0.08), life: 0, max: this.rng.range(520, 1050),
        tone: this.rng.next() < 0.55 ? C.bone : C.pink,
      });
    }
  }

  /** RAID's verified insecticide-bottle smash, adapted into a signature beat. */
  insecticideBottle(x: number, y: number, dir = 1): void {
    this.bottles.push({ x, y, dir, life: 0, max: 900 });
    this.burst(x, y + 0.9, 1.35, C.squelsh);
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
    for (let i = this.streamers.length - 1; i >= 0; i--) {
      const st = this.streamers[i]!;
      st.life += dt;
      if (st.life < 0) continue;
      st.x += st.vx * s;
      st.y += st.vy * s + Math.sin(st.life / 70 + st.phase) * 0.003;
      st.vx *= Math.pow(0.985, dt / 16.67);
      st.vy -= 0.65 * s;
      if (st.life >= st.max) this.streamers.splice(i, 1);
    }
    for (let i = this.phones.length - 1; i >= 0; i--) {
      const p = this.phones[i]!;
      p.life += dt;
      if (p.life >= p.max) this.phones.splice(i, 1);
    }
    for (let i = this.notices.length - 1; i >= 0; i--) {
      const n = this.notices[i]!;
      n.life += dt;
      if (n.life >= n.max) this.notices.splice(i, 1);
    }
    for (let i = this.bottles.length - 1; i >= 0; i--) {
      const b = this.bottles[i]!;
      b.life += dt;
      if (b.life >= b.max) this.bottles.splice(i, 1);
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
    for (const st of this.streamers) {
      if (st.life < 0 || n++ > cap) continue;
      const fade = Math.max(0, 1 - st.life / st.max);
      lay.add(slab(
        st.x, st.y,
        0.25 * fade + 0.08, 0.025,
        0.008, st.spin + Math.sin(st.life / 80 + st.phase) * 0.55,
      ), st.tone, { noInk: true });
    }
    lay.flush(g, null);

    for (const e of this.notices) {
      const f = e.life / e.max;
      const arrive = Math.min(1, f / 0.22);
      const leave = f > 0.72 ? (f - 0.72) / 0.28 : 0;
      const x = e.x + e.dir * ((1 - arrive) * 3.0 + leave * 2.5);
      const y = e.y + 0.75 + Math.sin(f * Math.PI) * 0.18;
      g.save();
      g.translate(x, y);
      g.rotate(-e.dir * (0.22 - arrive * 0.12));
      g.fillStyle = '#F4E6C3';
      g.strokeStyle = C.ink;
      g.lineWidth = ink * 1.3;
      g.fillRect(-0.88, -0.48, 1.76, 0.96);
      g.strokeRect(-0.88, -0.48, 1.76, 0.96);
      g.fillStyle = C.blood;
      g.fillRect(-0.78, -0.36, 1.56, 0.18);
      g.fillStyle = C.ink;
      g.font = '900 0.20px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('EVICTION', 0, 0.03);
      g.font = '900 0.13px monospace';
      g.fillText('NOTICE', 0, 0.27);
      g.restore();
    }

    for (const b of this.bottles) {
      const f = b.life / b.max;
      const swing = Math.sin(Math.min(1, f / 0.46) * Math.PI) * 1.6;
      const bx = b.x - b.dir * 0.56 + b.dir * f * 0.68;
      const by = b.y + 1.1 + Math.sin(f * Math.PI) * 0.48;
      const bt = new Layer(C.ink, ink * 1.15);
      bt.add(slab(bx, by, 0.28, 0.72, 0.06, b.dir * (-0.55 + swing)), '#B9FF45');
      bt.add(slab(bx + b.dir * 0.04, by + 0.43, 0.15, 0.18, 0.04, b.dir * (-0.55 + swing)), C.bone);
      bt.add(ellipse(bx, by - 0.08, 0.10, 0.10), C.blood, { noInk: true });
      bt.flush(g, null);
    }

    // The phone is drawn last so it reads like the huge stage gag it is.
    for (const p of this.phones) {
      const f = p.life / p.max;
      const drop = f < 0.30 ? 1 - Math.pow(1 - f / 0.30, 3) : 1;
      const exit = f > 0.76 ? (f - 0.76) / 0.24 : 0;
      const py = p.y + (1 - drop) * 3.8 + exit * 4.4;
      const squash = f > 0.28 && f < 0.58 ? 1.12 : 1;
      const ph = new Layer(C.ink, ink * 1.25);
      ph.add(slab(p.x, py + 0.28, 1.45 * squash, 0.34, 0.08, p.dir * -0.06), '#E8B33A');
      ph.add(slab(p.x - 0.64, py + 0.30, 0.34, 0.62, 0.08, -0.12), '#C88A22');
      ph.add(slab(p.x + 0.64, py + 0.30, 0.34, 0.62, 0.08, 0.12), '#C88A22');
      ph.add(slab(p.x, py - 0.05, 1.08, 0.42, 0.06), '#2A2018');
      ph.flush(g, null);
    }

    void poly;
  }
}