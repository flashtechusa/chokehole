/**
 * Screen-printed drawing.
 *
 * The look is the deck's: flat saturated colour, a heavy ink line round
 * everything, halftone where a surface needs a value. No gradients, no
 * lighting, no shading ramps — the line and the fill do all of it.
 *
 * The one trick worth knowing is how the outline is made. Shapes are collected
 * into a LAYER; flushing a layer strokes every shape in it with a fat ink pen
 * first and then fills them all on top. The strokes of overlapping shapes merge
 * into a single silhouette, so an arm and a torso in the same layer read as one
 * cut-out rather than as two circled parts — while a shape in a LATER layer
 * keeps its own line over what came before, which is exactly what separates a
 * near arm from the chest behind it.
 */
export type Ctx = CanvasRenderingContext2D;

export interface Shape {
  path: Path2D;
  fill: string;
  /** Halftone dots over the fill, in this colour. */
  dots?: string;
  /** Skip this shape's contribution to the ink silhouette. */
  noInk?: boolean;
}

export class Layer {
  private shapes: Shape[] = [];
  constructor(private ink: string, private width: number) {}

  add(path: Path2D, fill: string, opts?: { dots?: string; noInk?: boolean }): void {
    this.shapes.push({ path, fill, dots: opts?.dots, noInk: opts?.noInk });
  }

  get length(): number { return this.shapes.length; }

  flush(g: Ctx, dotPattern: CanvasPattern | null): void {
    if (!this.shapes.length) return;
    g.save();
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.strokeStyle = this.ink;
    g.lineWidth = this.width;
    for (const s of this.shapes) if (!s.noInk) g.stroke(s.path);
    for (const s of this.shapes) {
      g.fillStyle = s.fill;
      g.fill(s.path);
      if (s.dots && dotPattern) {
        g.save();
        g.clip(s.path);
        g.globalAlpha = 0.5;
        g.fillStyle = dotPattern;
        const b = { x: -4000, y: -4000, w: 8000, h: 8000 };
        g.fillRect(b.x, b.y, b.w, b.h);
        g.restore();
      }
    }
    g.restore();
    this.shapes = [];
  }
}

/* ------------------------------------------------------------------ *
 * shapes
 * ------------------------------------------------------------------ */

/** A limb: a tapered capsule from one joint to the next. */
export function capsule(
  x1: number, y1: number, r1: number, x2: number, y2: number, r2: number,
): Path2D {
  const p = new Path2D();
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const a = Math.atan2(dy, dx);
  p.moveTo(x1 + nx * r1, y1 + ny * r1);
  p.lineTo(x2 + nx * r2, y2 + ny * r2);
  p.arc(x2, y2, r2, a - Math.PI / 2, a + Math.PI / 2);
  p.lineTo(x1 - nx * r1, y1 - ny * r1);
  p.arc(x1, y1, r1, a + Math.PI / 2, a + Math.PI * 1.5);
  p.closePath();
  return p;
}

export function ellipse(
  cx: number, cy: number, rx: number, ry: number, rot = 0,
): Path2D {
  const p = new Path2D();
  p.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), rot, 0, Math.PI * 2);
  return p;
}

/** A rounded slab, used for torsos, hips and anything built rather than grown. */
export function slab(
  cx: number, cy: number, w: number, h: number, r: number, rot = 0,
): Path2D {
  const p = new Path2D();
  const hw = w / 2;
  const hh = h / 2;
  const rr = Math.min(r, hw, hh);
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const pt = (x: number, y: number): [number, number] => [cx + x * c - y * s, cy + x * s + y * c];
  const corners: [number, number][] = [
    [hw - rr, -hh], [hw, -hh + rr], [hw, hh - rr], [hw - rr, hh],
    [-hw + rr, hh], [-hw, hh - rr], [-hw, -hh + rr], [-hw + rr, -hh],
  ];
  const q = corners.map(([x, y]) => pt(x, y));
  p.moveTo(q[0]![0], q[0]![1]);
  p.lineTo(q[1]![0], q[1]![1]);
  p.lineTo(q[2]![0], q[2]![1]);
  p.lineTo(q[3]![0], q[3]![1]);
  p.lineTo(q[4]![0], q[4]![1]);
  p.lineTo(q[5]![0], q[5]![1]);
  p.lineTo(q[6]![0], q[6]![1]);
  p.lineTo(q[7]![0], q[7]![1]);
  p.closePath();
  return p;
}

export function poly(pts: [number, number][]): Path2D {
  const p = new Path2D();
  if (!pts.length) return p;
  p.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) p.lineTo(pts[i]![0], pts[i]![1]);
  p.closePath();
  return p;
}

/** A jagged star, the deck's most-used device. */
export function starburst(
  cx: number, cy: number, rOuter: number, rInner: number, points: number, phase = 0,
): Path2D {
  const pts: [number, number][] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = phase + (i * Math.PI) / points;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return poly(pts);
}

/* ------------------------------------------------------------------ *
 * halftone
 * ------------------------------------------------------------------ */

/** A repeating dot screen, built once per colour and cached. */
export function dotPattern(
  g: Ctx, color: string, step: number, radius: number,
): CanvasPattern | null {
  const c = document.createElement('canvas');
  c.width = step;
  c.height = step;
  const h = c.getContext('2d');
  if (!h) return null;
  h.fillStyle = color;
  h.beginPath();
  h.arc(step / 2, step / 2, radius, 0, Math.PI * 2);
  h.fill();
  return g.createPattern(c, 'repeat');
}
