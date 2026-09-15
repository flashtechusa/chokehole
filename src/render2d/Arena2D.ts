import { C } from '@/game/config/canon';
import { RING } from '@/game/combat/ring';
import { Rng } from '@/game/util/rng';
import { Layer, ellipse, poly, slab, starburst, type Ctx } from './Paint';

/**
 * The room, flat.
 *
 * A wrestling ring seen from the side is a small number of horizontal bands:
 * wall, crowd, barricade, the ring's own front face, and the mat the fight
 * happens on. Everything the 3D build spent geometry on -- scaffold, roof
 * beams, gel cones, a warehouse with four walls -- was either behind the camera
 * or too small to read. This draws the bands.
 *
 * The ropes are the one piece of real depth: the far three sit behind the
 * wrestlers and the near three in front, which is what tells you the fight is
 * inside something.
 */
const MAT_Y = 1.13;
const APRON_DROP = 0.78;
const POST_H = 2.3;

export interface ArenaSign {
  x: number;
  y: number;
  w: number;
  tone: string;
  phase: number;
}

export class Arena2D {
  private rng = new Rng(0x51d3a7);
  private crowd: { x: number; y: number; s: number; tone: string; phase: number }[] = [];
  private signs: ArenaSign[] = [];
  private t = 0;

  constructor() {
    const tones = ['#3A2340', '#4A2A46', '#2E1C38', '#52304F', '#26162E'];
    /*
     * Rows stack UPWARD, not downward. In a flat side view there is no depth to
     * put a back row into, so the trick every 2D crowd uses is to draw the
     * further rows higher and smaller -- the first version put them below the
     * floor line instead, where the ring apron swallowed them whole.
     */
    for (let row = 0; row < 4; row++) {
      const y = 0.02 + row * 0.19;
      const n = 26 + row * 4;
      for (let i = 0; i < n; i++) {
        const x = -11 + (i / (n - 1)) * 22 + this.rng.range(-0.18, 0.18);
        this.crowd.push({
          x, y, s: this.rng.range(0.82, 1.16) * (1 - row * 0.07),
          tone: tones[Math.floor(this.rng.next() * tones.length)]!,
          phase: this.rng.next() * Math.PI * 2,
        });
      }
    }
    const signTones = [C.bone, '#F2E7B0', '#DCE8F0', '#E4EED0'];
    for (let i = 0; i < 9; i++) {
      this.signs.push({
        x: this.rng.range(-8.5, 8.5), y: 1.15 + this.rng.range(0, 0.55),
        w: this.rng.range(0.6, 0.95),
        tone: signTones[i % signTones.length]!,
        phase: this.rng.next() * Math.PI * 2,
      });
    }
  }

  update(dt: number): void { this.t += dt / 1000; }

  /** Wall, crowd and the far half of the ring. Drawn before the wrestlers. */
  drawBack(g: Ctx, ink: number, heat01: number, dots: CanvasPattern | null): void {
    const lay = new Layer(C.ink, ink);

    // Hung banner, behind everything.
    lay.add(slab(0, 2.95, 7.6, 1.35, 0.06), '#1B0F24');
    lay.flush(g, dots);
    const bn = new Layer(C.ink, ink * 0.6);
    bn.add(starburst(0, 2.98, 0.62, 0.38, 14, 0.2), C.magenta, { noInk: true });
    bn.add(starburst(0, 2.98, 0.47, 0.29, 14, 0.4), C.pink, { noInk: true });
    bn.flush(g, dots);

    // Crowd: flat silhouettes, bobbing harder as the room heats up.
    const bob = 0.02 + heat01 * 0.12;
    const crowd = new Layer(C.inkDeep, ink * 0.5);
    for (const p of this.crowd) {
      const lift = Math.max(0, Math.sin(this.t * (3 + heat01 * 4) + p.phase)) * bob;
      const y = p.y + lift;
      crowd.add(slab(p.x, y + 0.42 * p.s, 0.26 * p.s, 0.84 * p.s, 0.06), p.tone, { noInk: true });
      crowd.add(ellipse(p.x, y + 0.95 * p.s, 0.15 * p.s, 0.16 * p.s), p.tone, { noInk: true });
    }
    crowd.flush(g, dots);

    // Crowd signs over the heads.
    const sg = new Layer(C.ink, ink * 0.7);
    for (const s of this.signs) {
      const sway = Math.sin(this.t * (1.6 + heat01 * 3) + s.phase) * (0.04 + heat01 * 0.16);
      sg.add(slab(s.x + sway * 0.4, s.y, s.w, s.w * 0.72, 0.03, sway), s.tone);
      sg.add(slab(s.x + sway * 0.2, s.y - s.w * 0.55, 0.05, s.w * 0.6, 0.02, sway), '#5A4636');
    }
    sg.flush(g, dots);

    // Barricade: one lit rail across the whole width.
    const bar = new Layer(C.ink, ink);
    bar.add(slab(0, 0.30, 24, 0.07, 0.02), '#8A7499');
    bar.add(slab(0, 0.56, 24, 0.05, 0.02), C.acid);
    for (let i = -11; i <= 11; i++) bar.add(slab(i, 0.26, 0.06, 0.62, 0.02), '#8A7499');
    bar.flush(g, dots);

    // Far ropes and the far posts sit behind the fight.
    this.posts(g, ink, -1, dots);
    this.ropes(g, ink, -1, dots, 'all');
    /*
     * And so do the top two NEAR ropes. Drawing all three in front is what a
     * side view literally sees, and it put a rope across both wrestlers' faces
     * -- so the upper pair go behind and only the bottom rope crosses in front,
     * which still reads as being inside the ring and lets you see the fight.
     */
    this.ropes(g, ink, 1, dots, 'upper');
  }

  /** The apron, the mat edge and the near ropes. Drawn over the wrestlers. */
  drawFront(g: Ctx, ink: number, dots: CanvasPattern | null): void {
    this.ropes(g, ink, 1, dots, 'bottom');

    const lay = new Layer(C.ink, ink);
    const half = RING.half + 0.55;
    // The ring's front face: the biggest flat colour on screen, so it carries
    // the sponsor band and the halftone rather than a texture.
    lay.add(slab(0, MAT_Y - APRON_DROP / 2, half * 2, APRON_DROP, 0.02), '#6E1560',
      { dots: C.ink });
    lay.add(slab(0, MAT_Y - 0.09, half * 2, 0.18, 0.02), C.pink);
    lay.add(slab(0, MAT_Y - 0.48, half * 2, 0.26, 0.02), C.acid);
    lay.flush(g, dots);

    this.posts(g, ink, 1, dots);
  }

  /** The mat the fight stands on, under the wrestlers. */
  drawMat(g: Ctx, ink: number, dots: CanvasPattern | null): void {
    const lay = new Layer(C.ink, ink);
    const half = RING.half + 0.55;
    lay.add(poly([
      [-half, MAT_Y], [half, MAT_Y], [half - 0.35, MAT_Y + 0.42], [-half + 0.35, MAT_Y + 0.42],
    ]), '#EFE3C8', { dots: C.pink });
    lay.flush(g, dots);
  }

  private posts(g: Ctx, ink: number, sign: number, dots: CanvasPattern | null): void {
    const lay = new Layer(C.ink, ink);
    const half = RING.half + 0.5;
    const depth = sign > 0 ? 0 : 0.34;
    const lift = sign > 0 ? 0 : 0.22;
    for (const s of [-1, 1]) {
      const x = s * (half - depth);
      lay.add(slab(x, MAT_Y + lift + POST_H / 2, 0.19, POST_H, 0.04), C.pink);
      lay.add(slab(x, MAT_Y + lift + POST_H + 0.1, 0.27, 0.24, 0.05), C.acid);
    }
    lay.flush(g, dots);
  }

  private ropes(
    g: Ctx, ink: number, sign: number, dots: CanvasPattern | null,
    which: 'all' | 'upper' | 'bottom',
  ): void {
    const lay = new Layer(C.ink, ink * 0.7);
    const half = RING.half + 0.5;
    const depth = sign > 0 ? 0 : 0.34;
    const lift = sign > 0 ? 0 : 0.22;
    const cols = [C.acid, C.bone, C.pink];
    for (let i = 0; i < 3; i++) {
      if (which === 'upper' && i === 0) continue;
      if (which === 'bottom' && i !== 0) continue;
      const y = MAT_Y + lift + 0.62 + i * 0.62;
      lay.add(slab(0, y, (half - depth) * 2, 0.075, 0.03), cols[i]!);
    }
    lay.flush(g, dots);
  }
}

export const RING_MAT_Y = MAT_Y;
