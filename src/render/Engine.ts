import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
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
}

export const PRESETS: Record<Quality, QualityPreset> = {
  LOW: { scale: 1.8, fog: false, crowd: true, rigLights: 0, maxShards: 40 },
  MEDIUM: { scale: 1.3, fog: true, crowd: true, rigLights: 1, maxShards: 90 },
  HIGH: { scale: 1.0, fog: true, crowd: true, rigLights: 2, maxShards: 160 },
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

  const rigLights: PointLight[] = [];
  for (let i = 0; i < 2; i++) {
    const spec = arena.lighting.rig[i];
    if (!spec) break;
    const a = (i / 2) * Math.PI * 2 + 0.8;
    const p = new PointLight(`rig${i}`, new Vector3(Math.cos(a) * 4.4, 4.6, Math.sin(a) * 4.4), scene);
    p.diffuse = Color3.FromHexString(spec.color);
    p.intensity = spec.intensity * 12;
    p.range = 16;
    rigLights.push(p);
  }

  let quality: Quality = 'HIGH';
  const setQuality = (q: Quality): void => {
    quality = q;
    const p = PRESETS[q];
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
    dispose(): void {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      scene.dispose();
      engine.dispose();
    },
  };
}
