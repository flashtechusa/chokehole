import { C } from '@/game/config/canon';
import { RING } from '@/game/combat/ring';
import { Rng } from '@/game/util/rng';
import { Layer, ellipse, poly, slab, starburst, type Ctx } from './Paint';

/**
 * The room, flat.
 *
 * The crowd is deliberately 2D. CHOKE HOLE needs the room to feel alive, but a
 * phone should spend its frame budget on the wrestlers and their choreography,
 * not on hundreds of independent 3D people. These silhouettes are batched into
 * the same flat draw pass as the arena and switch reaction poses from match
 * events (taunts, near falls, signatures and finishers).
 */
const MAT_Y = 1.13;
const APRON_DROP = 0.78;
const POST_H = 2.3;

type CrowdReaction = 'idle' | 'cheer' | 'big' | 'nearFall' | 'finisher' | 'victory';

export interface ArenaSign {
  x: number;
  y: number;
  w: number;
  tone: string;
  phase: number;
}

interface CrowdPerson {
  x: number;
  y: number;
  s: number;
  tone: string;
  phase: number;
  /** A stable per-person bias so the room never moves as one cloned loop. */
  energy: number;
}

export class Arena2D {
  private rng = new Rng(0x51d3a7);
  private crowd: CrowdPerson[] = [];
  private signs: ArenaSign[] = [];
  private t = 0;
  private reaction: CrowdReaction = 'idle';
  private reactionMs = 0;
  private reactionPower = 0;

  constructor() {
    const tones = ['#3A2340', '#4A2A46', '#2E1C38', '#52304F', '#26162E'];
    /*
     * Rows stack upward. Further rows are higher and a little smaller, which is
     * enough parallax/depth for a side-on arcade camera without any 3D crowd.
     */
    for (let row = 0; row < 4; row++) {
      const y = 0.02 + row * 0.19;
      const n = 26 + row * 4;
      for (let i = 0; i < n; i++) {
        const x = -11 + (i / (n - 1)) * 22 + this.rng.range(-0.18, 0.18);
        this.crowd.push({
          x,
          y,
          s: this.rng.range(0.82, 1.16) * (1 - row * 0.07),
          tone: tones[Math.floor(this.rng.next() * tones.length)]!,
          phase: this.rng.next() * Math.PI * 2,
          energy: this.rng.range(0.72, 1.28),
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

  /**
   * One cheap event-driven crowd control for the whole arena. The renderer does
   * not create crowd AI; the match tells the room what just happened and the
   * silhouettes sell it for a short beat.
   */
  react(kind: CrowdReaction): void {
    const spec: Record<CrowdReaction, [number, number]> = {
      idle: [0, 0],
      cheer: [0.38, 700],
      big: [0.62, 1000],
      nearFall: [0.82, 1450],
      finisher: [1, 1900],
      victory: [1, 2600],
    };
    const [power, ms] = spec[kind];
    if (power >= this.reactionPower || this.reactionMs < 260) {
      this.reaction = kind;
      this.reactionPower = power;
      this.reactionMs = ms;
    }
  }

  update(dt: number): void {
    this.t += dt / 1000;
    if (this.reactionMs > 0) {
      this.reactionMs = Math.max(0, this.reactionMs - dt);
      if (this.reactionMs === 0) {
        this.reaction = 'idle';
        this.reactionPower = 0;
      }
    }
  }

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

    /*
     * Crowd: heads, torsos and two actual arms. At idle the arms live near the
     * torso; on a big pop they rise overhead. This reads as people rather than
     * bollards while remaining one flat batched draw pass.
     */
    const response = Math.max(heat01 * 0.48, this.reactionPower);
    const bob = 0.018 + heat01 * 0.055 + response * 0.095;
    const crowd = new Layer(C.inkDeep, ink * 0.5);
    let idx = 0;
    for (const p of this.crowd) {
      const beat = Math.sin(this.t * (2.7 + heat01 * 4.2) + p.phase);
      const lift = Math.max(0, beat) * bob * p.energy;
      const y = p.y + lift;
      const bodyY = y + 0.42 * p.s;
      const headY = y + 0.95 * p.s;
      const arm = Math.min(1, response * p.energy + Math.max(0, beat) * heat01 * 0.35);
      const armRaise = 0.18 + arm * 0.62;
      const armSpread = 0.13 + arm * 0.16;
      const armRot = 0.22 + arm * 0.95;

      crowd.add(slab(p.x, bodyY, 0.26 * p.s, 0.84 * p.s, 0.06), p.tone, { noInk: true });
      crowd.add(ellipse(p.x, headY, 0.15 * p.s, 0.16 * p.s), p.tone, { noInk: true });
      crowd.add(slab(
        p.x - armSpread * p.s, bodyY + armRaise * p.s,
        0.075 * p.s, 0.52 * p.s, 0.03, -armRot,
      ), p.tone, { noInk: true });
      crowd.add(slab(
        p.x + armSpread * p.s, bodyY + armRaise * p.s,
        0.075 * p.s, 0.52 * p.s, 0.03, armRot,
      ), p.tone, { noInk: true });

      // Camera-phone flashes only happen on genuine room reactions. Sparse and
      // deterministic enough to remain cheap and non-distracting.
      if (response > 0.55 && ((idx + Math.floor(this.t * 7)) % 19 === 0)) {
        crowd.add(starburst(p.x + 0.18, headY + 0.18, 0.09, 0.045, 8, p.phase), C.bone, { noInk: true });
      }
      idx += 1;
    }
    crowd.flush(g, dots);

    // Crowd signs over the heads.
    const sg = new Layer(C.ink, ink * 0.7);
    for (const s of this.signs) {
      const swayPower = 0.04 + heat01 * 0.08 + response * 0.14;
      const sway = Math.sin(this.t * (1.6 + heat01 * 3) + s.phase) * swayPower;
      const lift = response > 0.72 ? 0.12 + response * 0.12 : 0;
      sg.add(slab(s.x + sway * 0.4, s.y + lift, s.w, s.w * 0.72, 0.03, sway), s.tone);
      sg.add(slab(s.x + sway * 0.2, s.y - s.w * 0.55 + lift, 0.05, s.w * 0.6, 0.02, sway), '#5A4636');
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
    // Top two near ropes stay behind the bodies for readability; the lowest
    // rope crosses in front in drawFront, which is enough to sell ring depth.
    this.ropes(g, ink, 1, dots, 'upper');
  }

  /** The apron, the mat edge and the near ropes. Drawn over the wrestlers. */
  drawFront(g: Ctx, ink: number, dots: CanvasPattern | null): void {
    this.ropes(g, ink, 1, dots, 'bottom');

    const lay = new Layer(C.ink, ink);
    const half = RING.half + 0.55;
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
      lay.add(slab(0, y, (half - depth) * 2, 0.05, 0.02), cols[i]!);
    }
    lay.flush(g, dots);
  }
}

export const RING_MAT_Y = MAT_Y;