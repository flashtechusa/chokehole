import { TUNING } from '@/game/config/tuning';
import { clamp } from '@/game/util/math';
import type { Fighter } from './Fighter';

export interface PinState {
  count: number;
  /** Half-width actually in play this count, after the per-count weighting. */
  liveHalf: number;
  /** 0..1 sweep position of the escape marker. */
  marker: number;
  /** Centre of the escape zone, 0..1. */
  zoneCenter: number;
  /** Half-width of the escape zone, 0..1. */
  zoneHalf: number;
  /** The defender gets one attempt per count. */
  attemptUsed: boolean;
  lastAttemptHit: boolean | null;
  elapsed: number;
}

/**
 * The pin is one large timing interaction, not frantic tapping (Bible s11).
 *
 * A marker sweeps the bar once per count and the defender taps ATTACK to kick
 * out. The escape zone narrows as health falls and narrows again if a finisher
 * has landed, so a pin is a finish rather than an opener.
 */
/**
 * How forgiving the escape zone is on each count.
 *
 * The first count cannot be escaped at all: nobody kicks out at half a second,
 * and allowing it meant every pin ended instantly with no tension. The escape
 * bar therefore only appears once the referee has counted ONE, and it is widest
 * on the last count — so the ordinary outcome is the kickout at two, which is
 * the biggest crowd moment in a wrestling match.
 */
const COUNT_ZONE_SCALE = [0, 0.6, 1.25];

/** True when the defender may attempt an escape at all. */
export function pinEscapable(count: number): boolean {
  return (COUNT_ZONE_SCALE[Math.min(count, COUNT_ZONE_SCALE.length - 1)] ?? 0) > 0;
}

export class PinSystem {
  static canPin(attacker: Fighter, defender: Fighter): boolean {
    if (!defender.isDown) return false;
    if (attacker.isDown || attacker.isBusy) return false;
    if (defender.healthFrac > TUNING.pin.maxHealthFrac && !defender.exhausted) return false;
    return attacker.distanceTo(defender) <= TUNING.pin.range;
  }

  static begin(defender: Fighter, finisherLanded: boolean): PinState {
    const half = PinSystem.zoneHalf(defender, finisherLanded);
    return {
      count: 0,
      marker: 0,
      zoneCenter: 0.5,
      zoneHalf: half,
      liveHalf: half * COUNT_ZONE_SCALE[0]!,
      attemptUsed: false,
      lastAttemptHit: null,
      elapsed: 0,
    };
  }

  static zoneHalf(defender: Fighter, finisherLanded: boolean): number {
    const t = clamp(defender.healthFrac / TUNING.pin.maxHealthFrac, 0, 1);
    const base = TUNING.pin.zoneAtZeroHealth
      + (TUNING.pin.zoneAtFullHealth - TUNING.pin.zoneAtZeroHealth) * t;
    const scaled = finisherLanded ? base * TUNING.pin.finisherZonePenalty : base;
    return defender.exhausted ? scaled * 0.5 : scaled;
  }

  /** Advances one count. Returns 'escape', 'pinned' or null to continue. */
  static update(
    p: PinState, dt: number, defender: Fighter, tapped: boolean, finisherLanded: boolean,
  ): 'escape' | 'pinned' | null {
    p.elapsed += dt;
    const t = (p.elapsed % TUNING.pin.countMs) / TUNING.pin.countMs;
    // ping-pong so the marker sweeps out and back within one count
    p.marker = t < 0.5 ? t * 2 : 2 - t * 2;

    /*
     * Taps at the very ends of the sweep do not burn the attempt. Nobody aims
     * at the turnaround, and without this a player mashing out of habit spends
     * every attempt on the first frame of each count and can never kick out —
     * which punishes the most common instinct in wrestling games for no
     * interesting reason.
     */
    const aimable = p.marker > 0.08 && p.marker < 0.92 && p.liveHalf > 0;
    if (tapped && !p.attemptUsed && aimable) {
      p.attemptUsed = true;
      const hit = Math.abs(p.marker - p.zoneCenter) <= p.liveHalf;
      p.lastAttemptHit = hit;
      if (hit && !defender.exhausted) return 'escape';
    }

    if (p.elapsed >= TUNING.pin.countMs * (p.count + 1)) {
      p.count += 1;
      p.attemptUsed = false;
      p.lastAttemptHit = null;
      // Re-roll the zone each count so it cannot be memorised.
      p.zoneCenter = 0.22 + Math.random() * 0.56;
      p.zoneHalf = PinSystem.zoneHalf(defender, finisherLanded);
      p.liveHalf = p.zoneHalf
        * COUNT_ZONE_SCALE[Math.min(p.count, COUNT_ZONE_SCALE.length - 1)]!;
      if (p.count >= 3) return 'pinned';
    }
    return null;
  }
}
