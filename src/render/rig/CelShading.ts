import { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase';
import type { Material } from '@babylonjs/core/Materials/material';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';

/**
 * Cel shading, as a StandardMaterial plugin.
 *
 * The wrestlers are primitives with baked vertex colours. Lit conventionally,
 * every limb carries a smooth diffuse gradient, which is exactly the thing that
 * announces "untextured 3D primitive" — a real toon-shaded game has a small
 * number of flat colour steps and a hard terminator between them.
 *
 * Rather than replace the material (which would throw away fog, vertex colours,
 * the emissive channel the hit-flash drives, and every other thing that already
 * works), this posterises the finished pixel. It quantises LUMINANCE and scales
 * the colour to match, so hue is preserved exactly and only the shading steps —
 * posterising the channels independently would shift a pink into a red at one
 * light level and not at the next.
 */
export class CelPlugin extends MaterialPluginBase {
  /** Number of shading steps. Low is the point; four reads as a comic. */
  steps = 4.0;
  /** Floor, so an unlit side of a body is still its own colour and not black. */
  floor = 0.05;

  constructor(material: Material) {
    super(material, 'Cel', 200, { CEL: true });
    this._enable(true);
  }

  override getClassName(): string { return 'CelPlugin'; }

  override prepareDefines(defines: Record<string, unknown>): void {
    defines.CEL = true;
  }

  override getUniforms(): { ubo: { name: string; size: number; type: string }[]; fragment: string } {
    return {
      ubo: [
        { name: 'celSteps', size: 1, type: 'float' },
        { name: 'celFloor', size: 1, type: 'float' },
      ],
      fragment: `#ifdef CEL
        uniform float celSteps;
        uniform float celFloor;
      #endif`,
    };
  }

  override bindForSubMesh(uniformBuffer: {
    updateFloat(name: string, value: number): void;
  }): void {
    uniformBuffer.updateFloat('celSteps', this.steps);
    uniformBuffer.updateFloat('celFloor', this.floor);
  }

  override getCustomCode(shaderType: string): Record<string, string> | null {
    if (shaderType !== 'fragment') return null;
    return {
      CUSTOM_FRAGMENT_MAIN_END: `
        #ifdef CEL
          vec3 celRgb = gl_FragColor.rgb;
          float celLum = dot(celRgb, vec3(0.2126, 0.7152, 0.0722));
          if (celLum > 0.0001) {
            /*
             * Band in a PERCEPTUAL space, not a linear one.
             *
             * Quantising luminance directly puts the lowest non-zero step at
             * 1/steps — a quarter brightness — so every dark value between an
             * eighth and three-eighths snapped up to it and a black latex
             * costume rendered as lavender. Banding the square root and
             * squaring back gives fine steps in the shadows and coarse ones in
             * the highlights, which is both how eyes work and how the reference
             * art is painted.
             */
            float celRoot = sqrt(celLum);
            float celBand = floor(celRoot * celSteps + 0.5) / celSteps;
            celBand = celBand * celBand;
            celBand = max(celBand, celFloor);
            gl_FragColor.rgb = celRgb * (celBand / celLum);
          }
        #endif
      `,
    };
  }
}

/** Turns a body material into a cel-shaded one. */
export function applyCel(material: StandardMaterial): CelPlugin {
  return new CelPlugin(material);
}
