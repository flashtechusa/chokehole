import type { Figure2D } from './art';
import type { Solution } from './Skeleton2D';
import { Layer, capsule, ellipse, poly, slab, type Ctx } from './Paint';

/**
 * Draws a wrestler as a flat cut-out, back to front.
 *
 * Everything is in world units with +Y up; the caller has already put the
 * canvas in that space and mirrored it if the fighter faces left, so this
 * always draws someone facing +X. Drawing in profile is the whole reason for
 * the rewrite: a face seen from the side can have a nose, a jaw and a lip, and
 * those read at fifty pixels where a modelled head never did.
 *
 * Six layers, because a layer is what the ink line wraps. Limbs behind the body
 * get their own silhouette, the torso gets one, and the near arm gets one over
 * the top — which is what tells you which arm is which.
 */
export function drawFigure(
  g: Ctx, fig: Figure2D, sol: Solution, inkWidth: number, dots: CanvasPattern | null,
): void {
  const p = fig.proportions;
  const c = fig.palette;
  const K = p.bulk;
  const ink = c.ink;
  const L = (): Layer => new Layer(ink, inkWidth);

  const upperLen = p.armLen * 0.48;
  const foreLen = p.armLen * 0.44;
  const thighLen = p.legLen * 0.48;
  const shinLen = p.legLen * 0.46;

  /** Walks a bone's own -Y axis to its far end. */
  const end = (b: keyof Solution, len: number): [number, number] => {
    const j = sol[b];
    return [j.x + Math.sin(j.a) * len, j.y - Math.cos(j.a) * len];
  };

  const sleeve = fig.costume.puffJacket ? c.alt : c.skin;
  const sleeveHi = fig.costume.puffJacket ? c.altHi : c.skinShade;

  /*
   * A pure side view buries one arm inside the chest and one leg inside the
   * other. Every 2D fighter cheats this the same way: the near limb is nudged
   * forward and down, the far limb back and up, so the pair separate without
   * the pose changing. It is the flat stand-in for the depth the clips encode
   * in their X component, which nothing else here reads.
   */
  const shift = (near: boolean): [number, number] =>
    near ? [0.055 * K, -0.022] : [-0.045 * K, 0.018];

  const arm = (side: 'L' | 'R', near: boolean): void => {
    const lay = L();
    const [sx, sy] = shift(near);
    const raw = (b: keyof Solution) => sol[b];
    const ua = { ...raw(`upperArm${side}` as keyof Solution) };
    const fa = { ...raw(`forearm${side}` as keyof Solution) };
    const hd = { ...raw(`hand${side}` as keyof Solution) };
    for (const j of [ua, fa, hd]) { j.x += sx; j.y += sy; }
    const [ex0, ey0] = end(`upperArm${side}` as keyof Solution, upperLen);
    const [wx0, wy0] = end(`forearm${side}` as keyof Solution, foreLen);
    const ex = ex0 + sx; const ey = ey0 + sy;
    const wx = wx0 + sx; const wy = wy0 + sy;
    const tone = near ? sleeve : sleeveHi;

    if (fig.costume.puffJacket) {
      // The puffed shoulder is the shape that identifies the jacket.
      lay.add(ellipse(ua.x, ua.y - 0.025, 0.125 * K, 0.115 * K, ua.a), tone);
    }
    lay.add(capsule(ua.x, ua.y, 0.088 * K, ex, ey, 0.070 * K), tone);
    lay.add(capsule(fa.x, fa.y, 0.070 * K, wx, wy, 0.058 * K), tone);
    // Hand: a fist, squared off, with a thumb ridge toward the front.
    const hx = hd.x;
    const hy = hd.y;
    lay.add(slab(hx + Math.sin(hd.a) * 0.05, hy - Math.cos(hd.a) * 0.05,
      0.12 * K, 0.11 * K, 0.04, hd.a), near ? c.skin : c.skinShade);
    lay.flush(g, dots);
  };

  const leg = (side: 'L' | 'R', near: boolean): void => {
    const lay = L();
    const [sx, sy] = shift(near);
    const th = { ...sol[`thigh${side}` as keyof Solution] };
    const sh = { ...sol[`shin${side}` as keyof Solution] };
    const ft = { ...sol[`foot${side}` as keyof Solution] };
    for (const j of [th, sh, ft]) { j.x += sx; j.y += sy * 0.4; }
    const [kx0, ky0] = end(`thigh${side}` as keyof Solution, thighLen);
    const [ax0, ay0] = end(`shin${side}` as keyof Solution, shinLen);
    const kx = kx0 + sx; const ky = ky0 + sy * 0.4;
    const ax = ax0 + sx; const ay = ay0 + sy * 0.4;
    const bare = fig.costume.fishnets ? '#3A2B3F' : c.skin;
    const bareFar = fig.costume.fishnets ? '#2A1F2E' : c.skinShade;
    const tone = near ? bare : bareFar;

    lay.add(capsule(th.x, th.y, 0.135 * K, kx, ky, 0.092 * K), tone,
      fig.costume.fishnets ? { dots: c.ink } : undefined);
    lay.add(capsule(sh.x, sh.y, 0.092 * K, ax, ay, 0.068 * K), tone,
      fig.costume.fishnets ? { dots: c.ink } : undefined);

    // Boot: a wedge forward of the ankle, with a platform under it.
    const ca = Math.cos(ft.a);
    const sa = Math.sin(ft.a);
    const fx = (lx: number, ly: number): [number, number] =>
      [ft.x + lx * ca - ly * sa, ft.y + lx * sa + ly * ca];
    const heel = Math.max(0.06, p.heel);
    // The ankle is the origin, so the boot wraps UP round it as well as
    // forward: a wedge that starts behind the heel and runs out over the toe.
    lay.add(poly([
      fx(-0.10, 0.16), fx(0.10, 0.16), fx(0.22, -heel * 0.35),
      fx(0.23, -heel), fx(-0.11, -heel), fx(-0.12, 0.04),
    ]), near ? c.boot : c.mainHi);
    lay.add(poly([
      fx(0.23, -heel), fx(-0.11, -heel), fx(-0.11, -heel + 0.035), fx(0.23, -heel + 0.035),
    ]), c.accent, { noInk: true });
    lay.flush(g, dots);
  };

  /**
   * The torso as ONE cut-out, not a stack of slabs.
   *
   * Three overlapping boxes plus a jacket panel plus a bust gave a figure with
   * no silhouette: a black void between a pink rectangle behind and a pink
   * circle in front. A single polygon walked through the chest, waist and hip
   * joints -- each point placed in its OWN bone's frame, so it still bends with
   * the spine -- gives one readable shape with a waist in it.
   */
  const torso = (): void => {
    const lay = L();
    const hips = sol.hips;
    const spine = sol.spine;
    const chest = sol.chest;
    const T = p.torsoLen;

    const at = (j: { x: number; y: number; a: number }, lx: number, ly: number): [number, number] => {
      const ca = Math.cos(j.a);
      const sa = Math.sin(j.a);
      return [j.x + lx * ca - ly * sa, j.y + lx * sa + ly * ca];
    };

    const shoulderF = at(chest, 0.20 * K, T * 0.30);
    const shoulderB = at(chest, -0.22 * K, T * 0.28);
    // The bust is a bulge in the torso's own front edge. As a separate ellipse
    // in the same flat black it read as a hole punched in the chest.
    const bustF = fig.costume.bodice ? at(chest, 0.31 * K, T * 0.10) : at(chest, 0.21 * K, T * 0.12);
    const underF = fig.costume.bodice ? at(chest, 0.17 * K, -T * 0.06) : at(chest, 0.17 * K, -T * 0.04);
    const waistF = at(spine, 0.13 * K, T * 0.06);
    const waistB = at(spine, -0.15 * K, T * 0.04);
    const hipF = at(hips, 0.22 * K, 0.06);
    const hipB = at(hips, -0.24 * K, 0.02);
    const seatF = at(hips, 0.16 * K, -0.16);
    const seatB = at(hips, -0.20 * K, -0.17);

    lay.add(poly([
      shoulderB, shoulderF, bustF, underF, waistF, hipF, seatF, seatB, hipB, waistB,
    ]), c.main, fig.costume.scales ? { dots: c.alt } : undefined);
    lay.flush(g, dots);

    const over = L();
    if (fig.costume.puffJacket) {
      /*
       * The jacket reads as a jacket because of its EDGES: a collar standing
       * up behind the neck and a lapel running down the open front. The body
       * of it is only the back panel, hugging the spine.
       */
      over.add(poly([
        at(chest, -0.22 * K, T * 0.32), at(chest, -0.05 * K, T * 0.34),
        at(spine, -0.08 * K, T * 0.02), at(spine, -0.19 * K, T * 0.0),
      ]), c.alt);
      over.add(poly([
        at(chest, 0.05 * K, T * 0.34), at(chest, 0.22 * K, T * 0.26),
        at(chest, 0.17 * K, T * 0.0), at(chest, 0.04 * K, T * 0.06),
      ]), c.alt);
      // Standing collar.
      over.add(poly([
        at(chest, -0.12 * K, T * 0.34), at(chest, -0.16 * K, T * 0.52),
        at(chest, 0.06 * K, T * 0.50), at(chest, 0.08 * K, T * 0.34),
      ]), c.altHi);
    }
    if (fig.costume.boltFront) {
      // Down the FRONT. It was on his back for the whole build.
      over.add(poly([
        at(chest, 0.20 * K, T * 0.30), at(chest, 0.01 * K, T * 0.02),
        at(chest, 0.15 * K, T * 0.02), at(spine, -0.02 * K, -T * 0.34),
        at(chest, 0.06 * K, -T * 0.04), at(chest, -0.08 * K, -T * 0.04),
        at(chest, 0.08 * K, T * 0.30),
      ]), c.accent);
    }
    if (fig.costume.scarf) {
      const nk = sol.neck;
      over.add(ellipse(nk.x + 0.01, nk.y + 0.035, 0.145 * K, 0.095 * K, nk.a), c.accent);
      // The knot's loose end, hanging down the open front.
      over.add(poly([
        at(chest, 0.12 * K, T * 0.36), at(chest, 0.27 * K, T * 0.06),
        at(chest, 0.16 * K, T * 0.02), at(chest, 0.09 * K, T * 0.26),
      ]), c.accent);
    }
    if (fig.costume.beltBand) {
      over.add(slab(...at(spine, 0, -T * 0.02), 0.34 * K, 0.115, 0.04, spine.a), c.accent);
    }
    if (fig.costume.studs) {
      for (let i = 0; i < 4; i++) {
        over.add(ellipse(...at(chest, -0.16 * K, T * 0.26 - i * 0.085), 0.019, 0.019),
          c.trim, { noInk: true });
      }
    }
    over.flush(g, dots);
  };

  const neckAndHead = (): void => {
    const lay = L();
    const nk = sol.neck;
    const hd = sol.head;
    const r = p.headR;
    const ca = Math.cos(hd.a);
    const sa = Math.sin(hd.a);
    const hf = (lx: number, ly: number): [number, number] =>
      [hd.x + lx * ca - ly * sa, hd.y + lx * sa + ly * ca];

    lay.add(capsule(nk.x, nk.y, 0.075 * K, hd.x, hd.y, 0.070 * K), c.skinShade);

    if (fig.head === 'glam') {
      // Skull and jaw, in profile: a chin and a brow, which is what a face is.
      lay.add(ellipse(...hf(-0.02, r * 0.85), r * 0.95, r * 1.05, hd.a), c.skin);
      lay.add(poly([
        hf(-r * 0.1, r * 1.0), hf(r * 0.92, r * 0.86), hf(r * 1.0, r * 0.3),
        hf(r * 0.55, r * 0.02), hf(-r * 0.2, r * 0.1),
      ]), c.skin);
    } else {
      // Wedge skull, driven forward.
      lay.add(poly([
        hf(-r * 0.9, r * 1.5), hf(r * 0.9, r * 1.35), hf(r * 1.45, r * 0.5),
        hf(r * 0.9, r * 0.05), hf(-r * 0.9, r * 0.2),
      ]), c.main, { dots: c.alt });
    }
    lay.flush(g, dots);

    const face = L();
    if (fig.head === 'glam') {
      if (fig.hair === 'bob') {
        /*
         * A dark chin-length bob with a blunt fringe, set BEHIND the face so
         * the profile survives. This is the correction the deck forced: the
         * build had a blonde bouffant, off a misread of the loose photographs,
         * and it covered her face besides.
         */
        face.add(poly([
          hf(-r * 1.15, r * 1.9), hf(r * 0.55, r * 2.0), hf(r * 0.95, r * 1.45),
          hf(r * 0.62, r * 1.3), hf(r * 0.2, r * 1.5), hf(-r * 0.5, r * 1.4),
          hf(-r * 0.95, r * 0.15), hf(-r * 1.35, r * 0.45),
        ]), c.hair);
        // The fringe, cut straight across the brow.
        face.add(poly([
          hf(-r * 0.3, r * 1.75), hf(r * 0.95, r * 1.55), hf(r * 1.0, r * 1.18),
          hf(-r * 0.3, r * 1.3),
        ]), c.hair);
      }
      // Brow, eye, lip. Three marks, and the head has an expression.
      face.add(ellipse(...hf(r * 0.62, r * 0.95), r * 0.17, r * 0.22, hd.a), c.eye,
        { noInk: true });
      face.add(poly([
        hf(r * 0.34, r * 1.2), hf(r * 0.92, r * 1.12), hf(r * 0.9, r * 1.02),
        hf(r * 0.36, r * 1.08),
      ]), c.hair, { noInk: true });
      face.add(ellipse(...hf(r * 0.8, r * 0.42), r * 0.2, r * 0.13, hd.a), c.mouth,
        { noInk: true });
    } else {
      if (fig.costume.spikes) {
        // A fan of small spikes off the back of the skull. Four big ones read
        // as a beak, which is a different animal entirely.
        for (let i = 0; i < 7; i++) {
          const t = i / 6;
          const sy = r * (0.5 + t * 1.15);
          const out = r * (0.55 + Math.sin(t * Math.PI) * 0.55);
          face.add(poly([
            hf(-r * 0.55, sy + r * 0.12),
            hf(-r * 0.55 - out, sy + r * (0.25 + t * 0.35)),
            hf(-r * 0.55, sy - r * 0.1),
          ]), c.trim);
        }
      }
      // Compound eye, set high and back off the maw.
      face.add(ellipse(...hf(r * 0.34, r * 1.02), r * 0.36, r * 0.27, hd.a), c.eye);
      face.add(ellipse(...hf(r * 0.42, r * 1.1), r * 0.12, r * 0.09, hd.a), c.mainHi,
        { noInk: true });
      if (fig.costume.maw) {
        // The maw is at the FRONT of the face, ringed with teeth. It is the
        // thing that reads as RAID from across the ring.
        const mx = r * 1.02;
        const my = r * 0.46;
        face.add(ellipse(...hf(mx, my), r * 0.40, r * 0.34, hd.a), c.mouth);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const ox = Math.cos(a);
          const oy = Math.sin(a);
          face.add(poly([
            hf(mx + ox * r * 0.36 - oy * r * 0.1, my + oy * r * 0.30 + ox * r * 0.1),
            hf(mx + ox * r * 0.36 + oy * r * 0.1, my + oy * r * 0.30 - ox * r * 0.1),
            hf(mx + ox * r * 0.12, my + oy * r * 0.10),
          ]), c.skin, { noInk: true });
        }
      }
    }
    face.flush(g, dots);
  };

  const extras = (): void => {
    const n = fig.costume.extraArms ?? 0;
    if (!n) return;
    const lay = L();
    for (const side of ['L', 'R'] as const) {
      for (const row of ['midArm', 'lowArm'] as const) {
        const b0 = sol[`${row}${side}` as keyof Solution];
        const away = side === 'L' ? -0.10 * K : 0.10 * K;
        const b = { ...b0, x: b0.x + away };
        const len = p.armLen * (row === 'midArm' ? 0.58 : 0.5);
        const [tx, ty] = [b.x + Math.sin(b.a) * len, b.y - Math.cos(b.a) * len];
        lay.add(capsule(b.x, b.y, 0.052 * K, tx, ty, 0.032 * K), c.alt);
        lay.add(ellipse(tx, ty, 0.046 * K, 0.046 * K), c.altHi);
      }
    }
    lay.flush(g, dots);
  };

  /*
   * Draw order. Which limb is near is fixed by the skeleton's own depth, not by
   * which way the fighter faces -- mirroring the figure does not move the
   * camera round it.
   */
  const nearIsL = sol.shoulderL.depth < 0;
  const far = nearIsL ? 'R' : 'L';
  const near = nearIsL ? 'L' : 'R';

  extras();
  arm(far, false);
  leg(far, false);
  torso();
  leg(near, true);
  neckAndHead();
  arm(near, true);
}
