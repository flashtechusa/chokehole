import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { ArenaConfig } from '@/game/arenas/types';

export type Quality = 'LOW' | 'MEDIUM' | 'HIGH';

export interface QualityPreset {
  /** Hardware scaling: >1 renders below native resolution. */
  scale: number;
  fog: boolean;
  crowd: boolean;
  /** Coloured practical lights on top of the key light. */
  rigLights: number;
  maxShards: number;
  /** Shadow map resolution, or 0 for no shadows. */
  shadowMap: number;
  /** Bloom on the neon. 0 disables the layer entirely. */
  glow: number;
}

export const PRESETS: Record<Quality, QualityPreset> = {
  LOW: { scale: 1.8, fog: false, crowd: true, rigLights: 0, maxShards: 40, shadowMap: 0, glow: 0 },
  MEDIUM: { scale: 1.3, fog: true, crowd: true, rigLights: 1, maxShards: 90, shadowMap: 512, glow: 0.22 },
  HIGH: { scale: 1.0, fog: true, crowd: true, rigLights: 2, maxShards: 160, shadowMap: 1024, glow: 0.3 },
};

/**
 * Picks a starting quality tier from the device, then GameLoop adjusts it from
 * measured frame time. Core gameplay must stay stable when quality drops
 * (Bible s6.3, s31).
 */
export function detectQuality(): Quality {
  const dpr = window.devicePixelRatio || 1;
  const cores = (navigator as unknown as { hardwareConcurrency?: number }).hardwareConcurrency ?? 4;
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4;
  const px = window.innerWidth * window.innerHeight * dpr * dpr;
  if (cores <= 4 || mem <= 3 || px > 4_000_000) return 'MEDIUM';
  if (cores >= 8 && mem >= 6) return 'HIGH';
  return 'MEDIUM';
}

export interface Stage {
  engine: Engine;
  scene: Scene;
  key: DirectionalLight;
  ambient: HemisphericLight;
  rigLights: PointLight[];
  setQuality(q: Quality): void;
  quality: Quality;
  /** Registers meshes that should cast a shadow onto the mat. */
  addShadowCasters(meshes: AbstractMesh[]): void;
  removeShadowCasters(meshes: AbstractMesh[]): void;
  dispose(): void;
}

export function createStage(canvas: HTMLCanvasElement, arena: ArenaConfig): Stage {
  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: false,
    stencil: false,
    antialias: true,
    powerPreference: 'high-performance',
    // Safari can lose the context on tab switch; keep the game recoverable.
    doNotHandleContextLost: false,
  }, true);
  engine.setHardwareScalingLevel(1);

  const scene = new Scene(engine);
  scene.clearColor = Color4.FromHexString(`${arena.lighting.clearColor}ff`);
  scene.ambientColor = Color3.FromHexString(arena.lighting.ambient);
  scene.skipPointerMovePicking = true;
  scene.autoClearDepthAndStencil = true;
  // Nothing in the 3D scene is interactive: all input is the HTML overlay.
  scene.detachControl();

  // A placeholder camera so the scene renders on the title screen, before any
  // match (and therefore any DirectorCamera) exists.
  const idleCam = new UniversalCamera('idle', new Vector3(0, 2.6, -8.2), scene);
  idleCam.setTarget(new Vector3(0, 1.3, 0));
  idleCam.inputs.clear();
  scene.activeCamera = idleCam;

  const ambient = new HemisphericLight('ambient', new Vector3(0.2, 1, 0.1), scene);
  ambient.intensity = arena.lighting.ambientIntensity;
  ambient.diffuse = Color3.FromHexString(arena.lighting.ambient);
  ambient.groundColor = Color3.FromHexString('#120A18');

  const key = new DirectionalLight('key', new Vector3(-0.45, -1, 0.35), scene);
  key.intensity = arena.lighting.keyIntensity;
  key.diffuse = Color3.FromHexString(arena.lighting.keyColor);
  key.position = new Vector3(3, 9, -3);
  // Tight bounds keep the shadow map's texels on the ring instead of spreading
  // them over the whole warehouse, which is the difference between a shadow and
  // a smudge.
  key.shadowMinZ = 2;
  key.shadowMaxZ = 22;
  key.autoUpdateExtends = false;
  key.orthoLeft = -7;
  key.orthoRight = 7;
  key.orthoTop = 7;
  key.orthoBottom = -7;

  /*
   * A back light. The key comes from front-left and the ambient is flat, so
   * without this every body was lit evenly across its whole silhouette and read
   * as a cut-out. A dim, cool light from behind and above picks out the top and
   * back edges of a shoulder or a thigh and gives the form somewhere to turn.
   */
  const rim = new DirectionalLight('rim', new Vector3(0.5, -0.65, -1), scene);
  rim.intensity = arena.lighting.keyIntensity * 0.4;
  rim.diffuse = Color3.FromHexString(arena.lighting.ambient);
  rim.specular = new Color3(0.5, 0.5, 0.6);
  rim.position = new Vector3(-4, 7, 8);

  const rigLights: PointLight[] = [];
  for (let i = 0; i < 2; i++) {
    const spec = arena.lighting.rig[i];
    if (!spec) break;
    const a = (i / 2) * Math.PI * 2 + 0.8;
    /*
     * Coloured practicals hung over the RING, not room lights. At intensity x12
     * and a 16-unit range they reached the crowd, the walls and the barricade,
     * so switching to a higher quality tier flooded the whole warehouse pink
     * and made the picture worse than the tier below it. Tight and overhead:
     * they should pool on the canvas and fall off before they reach the seats.
     */
    const p = new PointLight(`rig${i}`, new Vector3(Math.cos(a) * 3.0, 5.6, Math.sin(a) * 3.0), scene);
    p.diffuse = Color3.FromHexString(spec.color);
    p.intensity = spec.intensity * 5;
    p.range = 8.5;
    rigLights.push(p);
  }

  let shadows: ShadowGenerator | null = null;
  let glow: GlowLayer | null = null;
  const casters = new Set<AbstractMesh>();

  const buildShadows = (size: number): void => {
    shadows?.dispose();
    shadows = null;
    if (size <= 0) return;
    const g = new ShadowGenerator(size, key);
    // A blurred exponential map: a hard shadow map at 512 on a phone stairsteps
    // badly across a flat canvas, and a wrestling shadow wants to be soft.
    g.useBlurExponentialShadowMap = true;
    g.blurKernel = 32;
    g.depthScale = 60;
    g.darkness = 0.45;
    for (const m of casters) g.addShadowCaster(m);
    shadows = g;
  };

  let quality: Quality = 'HIGH';
  const setQuality = (q: Quality): void => {
    quality = q;
    const p = PRESETS[q];
    buildShadows(p.shadowMap);
    if (p.glow > 0) {
      if (!glow) glow = new GlowLayer('neon', scene, { blurKernelSize: 24 });
      glow.intensity = p.glow;
    } else {
      glow?.dispose();
      glow = null;
    }
    // hardwareScalingLevel is a divisor on CSS pixels, so a bigger preset scale
    // means a lower render resolution. Device ratio is capped at 2: a 3x phone
    // gains nothing visible for more than double the fragments.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    engine.setHardwareScalingLevel(p.scale / dpr);
    // Fog reads as warehouse haze; dropping it is the cheapest big win.
    if (p.fog) {
      scene.fogMode = Scene.FOGMODE_EXP2;
      scene.fogColor = Color3.FromHexString(arena.lighting.fogColor);
      scene.fogDensity = arena.lighting.fogDensity;
    } else {
      scene.fogMode = Scene.FOGMODE_NONE;
    }
    rigLights.forEach((l, i) => l.setEnabled(i < p.rigLights));
  };
  setQuality(detectQuality());

  const onResize = (): void => engine.resize();
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  return {
    engine, scene, key, ambient, rigLights,
    setQuality,
    get quality() { return quality; },
    addShadowCasters(meshes: AbstractMesh[]): void {
      for (const m of meshes) {
        casters.add(m);
        shadows?.addShadowCaster(m);
      }
    },
    removeShadowCasters(meshes: AbstractMesh[]): void {
      for (const m of meshes) {
        casters.delete(m);
        shadows?.removeShadowCaster(m);
      }
    },
    dispose(): void {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      scene.dispose();
      engine.dispose();
    },
  };
}
