import { TUNING } from '@/game/config/tuning';
import { clamp } from '@/game/util/math';

/**
 * Crowd heat. Lives mostly under the hood (Bible s10.4): it drives audio,
 * lighting, IT Factor gain and the post-match rating, and the HUD shows only a
 * small state pip rather than a third bar competing for screen space.
 */
export class HeatMeter {
  value = 0;
  peak = 0;

  add(amount: number): void {
    this.value = clamp(
      this.value + amount * TUNING.meters.heatScale, 0, TUNING.meters.heatMax,
    );
    this.peak = Math.max(this.peak, this.value);
  }

  update(dt: number): void {
    this.value = clamp(
      this.value - (TUNING.meters.heatDecayPerSec * dt) / 1000, 0, TUNING.meters.heatMax,
    );
  }

  get frac(): number { return this.value / TUNING.meters.heatMax; }

  get label(): 'COLD' | 'WARM' | 'HOT' | 'ROWDY' | 'UNHINGED' {
    const f = this.frac;
    if (f > 0.88) return 'UNHINGED';
    if (f > 0.66) return 'ROWDY';
    if (f > 0.4) return 'HOT';
    if (f > 0.16) return 'WARM';
    return 'COLD';
  }
}
