import type { Scene } from '@babylonjs/core/scene';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { C } from '@/game/config/canon';

/**
 * Canvas-painted textures. The pitch deck's language is printed matter —
 * halftone, collage, screen-printed type — so the mat, apron and banners are
 * drawn rather than modelled. Everything here is generated at runtime: no image
 * files ship, and nothing is scraped.
 */

/** Heavy display face. iOS ships no Impact, so 900-weight system-ui is the floor. */
export const SLAB = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
export const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

export function makeTexture(
  scene: Scene, name: string, size: number, draw: (g: CanvasRenderingContext2D, s: number) => void,
): DynamicTexture {
  const t = new DynamicTexture(name, { width: size, height: size }, scene, false);
  const g = t.getContext() as unknown as CanvasRenderingContext2D;
  draw(g, size);
  t.update(false);
  return t;
}

export function emissiveMat(
  scene: Scene, name: string, tex: DynamicTexture, glow = 0.45,
): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseTexture = tex;
  m.emissiveTexture = tex;
  m.emissiveColor = new Color3(glow, glow, glow);
  m.specularColor = new Color3(0.05, 0.05, 0.06);
  m.maxSimultaneousLights = 4;
  return m;
}

/** Comic halftone dots, the deck's most recognisable print texture. */
export function halftone(
  g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  color: string, step: number, radius: number, alpha = 1,
): void {
  g.save();
  g.globalAlpha = alpha;
  g.fillStyle = color;
  for (let yy = y; yy < y + h; yy += step) {
    for (let xx = x; xx < x + w; xx += step) {
      g.beginPath();
      g.arc(xx + (Math.floor(yy / step) % 2 ? step / 2 : 0), yy, radius, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.restore();
}

/** Jagged starburst, used behind callouts and on the mat. */
export function starburst(
  g: CanvasRenderingContext2D, cx: number, cy: number, rOuter: number, rInner: number,
  points: number, color: string, rotation = 0,
): void {
  g.save();
  g.fillStyle = color;
  g.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = rotation + (i / (points * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? rOuter : rInner;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.closePath();
  g.fill();
  g.restore();
}

export function fitText(
  g: CanvasRenderingContext2D, text: string, cx: number, cy: number, maxW: number,
  weight: string, family: string, color: string, startPx: number,
): void {
  let px = startPx;
  g.font = `${weight} ${px}px ${family}`;
  while (g.measureText(text).width > maxW && px > 8) {
    px -= 2;
    g.font = `${weight} ${px}px ${family}`;
  }
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, cx, cy);
}

/** The mat: a screen-printed canvas with the logo and a halftone wash. */
export function matTexture(scene: Scene): DynamicTexture {
  return makeTexture(scene, 'mat', 1024, (g, s) => {
    // A box's top face samples its UVs mirrored, so the logo came out backwards
    // when read from the camera. Draw the whole mat flipped to cancel it.
    g.translate(s, 0);
    g.scale(-1, 1);
    g.fillStyle = '#E8DCC6';
    g.fillRect(0, 0, s, s);
    halftone(g, 0, 0, s, s, '#C9B79A', 16, 3, 0.5);

    // corner blocks
    g.fillStyle = C.pink;
    const cb = s * 0.13;
    g.fillRect(0, 0, cb, cb);
    g.fillRect(s - cb, s - cb, cb, cb);
    g.fillStyle = C.squelsh;
    g.fillRect(s - cb, 0, cb, cb);
    g.fillRect(0, s - cb, cb, cb);

    // ring border
    g.strokeStyle = C.ink;
    g.lineWidth = s * 0.018;
    g.strokeRect(s * 0.045, s * 0.045, s * 0.91, s * 0.91);

    starburst(g, s / 2, s / 2, s * 0.40, s * 0.27, 14, 'rgba(227,39,143,0.20)', 0.2);

    g.save();
    g.translate(s / 2, s / 2);
    g.rotate(-0.06);
    fitText(g, 'CHOKE HOLE', 0, -s * 0.055, s * 0.72, '900', SLAB, C.ink, 170);
    fitText(g, 'NO HOLES BARRED', 0, s * 0.055, s * 0.55, '900', SLAB, C.magenta, 78);
    fitText(g, 'I.B.S.', 0, s * 0.15, s * 0.3, '900', SLAB, 'rgba(30,17,43,0.45)', 54);
    g.restore();
  });
}

/** The apron skirt: sponsor banner, the loudest legible surface in the room. */
export function apronTexture(scene: Scene): DynamicTexture {
  return makeTexture(scene, 'apron', 1024, (g, s) => {
    const h = s;
    g.fillStyle = C.ink;
    g.fillRect(0, 0, s, h);
    g.fillStyle = C.magenta;
    g.fillRect(0, h * 0.0, s, h * 0.08);
    g.fillStyle = C.squelsh;
    g.fillRect(0, h * 0.92, s, h * 0.08);
    halftone(g, 0, 0, s, h, C.pink, 22, 4, 0.22);

    g.save();
    g.translate(s / 2, h * 0.5);
    fitText(g, 'SQUELSH', 0, -h * 0.09, s * 0.8, '900', SLAB, C.squelsh, 190);
    fitText(g, 'THE ENERGY DRINK THAT CALMS YOU DOWN', 0, h * 0.10, s * 0.86,
      '700', MONO, C.bone, 62);
    g.restore();
  });
}

/** A painted warehouse banner behind the crowd. */
export function bannerTexture(scene: Scene): DynamicTexture {
  return makeTexture(scene, 'banner', 1024, (g, s) => {
    g.fillStyle = '#1B0F24';
    g.fillRect(0, 0, s, s);
    halftone(g, 0, 0, s, s, '#2E1B3C', 14, 3, 0.9);

    starburst(g, s * 0.5, s * 0.42, s * 0.40, s * 0.24, 18, C.magenta, 0.1);
    starburst(g, s * 0.5, s * 0.42, s * 0.30, s * 0.19, 18, C.pink, 0.28);

    g.save();
    g.translate(s * 0.5, s * 0.42);
    g.rotate(-0.05);
    fitText(g, 'CHOKE', 0, -s * 0.085, s * 0.62, '900', SLAB, C.bone, 210);
    fitText(g, 'HOLE', 0, s * 0.085, s * 0.62, '900', SLAB, C.squelsh, 210);
    g.restore();

    g.fillStyle = C.ink;
    g.fillRect(0, s * 0.78, s, s * 0.1);
    fitText(g, 'I.B.S.  //  INTERGALACTIC BROADCASTING SERVICES', s * 0.5, s * 0.83, s * 0.9,
      '700', MONO, C.acid, 48);
  });
}

/** Cheap taped-up flyers for the warehouse walls. */
export function flyerTexture(scene: Scene, idx: number): DynamicTexture {
  const sets = [
    { bg: C.pink, fg: C.ink, a: 'SQUELSH', b: 'NOW WITH LESS CONSENT' },
    { bg: C.acid, fg: C.ink, a: 'FORGED', b: 'FASHION SHOW PERMIT' },
    { bg: C.squelsh, fg: C.ink, a: 'CHOKE H.E.R.', b: 'A GOD-FEARING FIGHT CLUB' },
    { bg: C.blue, fg: C.bone, a: 'I.B.S.', b: 'AUDIENCE UNINSURED' },
  ];
  const k = sets[idx % sets.length]!;
  return makeTexture(scene, `flyer${idx}`, 256, (g, s) => {
    g.fillStyle = k.bg;
    g.fillRect(0, 0, s, s);
    halftone(g, 0, 0, s, s, k.fg, 10, 2, 0.18);
    fitText(g, k.a, s / 2, s * 0.38, s * 0.86, '900', SLAB, k.fg, 76);
    fitText(g, k.b, s / 2, s * 0.62, s * 0.86, '700', MONO, k.fg, 26);
  });
}
