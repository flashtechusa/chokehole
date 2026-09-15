/**
 * The 2D stage: a canvas, a frame clock, and a quality tier.
 *
 * It replaces a WebGL engine, a scene graph, three lights, a shadow map, a glow
 * layer and a cel-shading material plugin with a 2D context. Everything that
 * used to be a rendering feature is now either a drawing decision or gone.
 */
export type Quality = 'LOW' | 'MEDIUM' | 'HIGH';

export interface QualityPreset {
  /** Device pixel ratio cap. */
  dpr: number;
  /** Halftone dots on the big flat areas. */
  halftone: boolean;
  /** Crowd rows drawn. */
  crowd: number;
  /** Ink line weight in CSS pixels. */
  ink: number;
  /** Debris pieces alive at once. */
  maxShards: number;
}

export const PRESETS: Record<Quality, QualityPreset> = {
  LOW: { dpr: 1, halftone: false, crowd: 2, ink: 2.6, maxShards: 40 },
  MEDIUM: { dpr: 1.5, halftone: true, crowd: 3, ink: 3.0, maxShards: 90 },
  HIGH: { dpr: 2, halftone: true, crowd: 4, ink: 3.4, maxShards: 150 },
};

export function detectQuality(): Quality {
  const dm = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  if (dm <= 2 || cores <= 4) return 'MEDIUM';
  return 'HIGH';
}

export interface Stage2D {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  quality: Quality;
  preset: QualityPreset;
  /** CSS pixels. */
  width: number;
  height: number;
  setQuality(q: Quality): void;
  runRenderLoop(cb: () => void): void;
  getDeltaTime(): number;
  dispose(): void;
}

export function createStage2D(canvas: HTMLCanvasElement): Stage2D {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('no 2d context');

  let quality: Quality = detectQuality();
  let raf = 0;
  let last = performance.now();
  let dt = 16.7;
  let width = 1;
  let height = 1;

  const resize = (): void => {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, PRESETS[quality].dpr);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  const stage: Stage2D = {
    canvas,
    ctx,
    get quality() { return quality; },
    get preset() { return PRESETS[quality]; },
    get width() { return width; },
    get height() { return height; },
    setQuality(q: Quality): void { quality = q; resize(); },
    runRenderLoop(cb: () => void): void {
      const tick = (): void => {
        const now = performance.now();
        dt = Math.min(60, now - last);
        last = now;
        cb();
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    },
    getDeltaTime(): number { return dt; },
    dispose(): void {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
    },
  };
  return stage;
}
