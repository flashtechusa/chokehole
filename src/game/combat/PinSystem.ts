import { TUNING } from '@/game/config/tuning';
import { clamp } from '@/game/util/math';
import type { Fighter } from './Fighter';

export interface PinState {
  count: number;
  /** How dangerous this cover is, fixed when it begins. */
  stakes: PinStakes;
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

/**
 * How dangerous a cover is, which is really a question about where the match is.
 * A pin in the opening minute is a transition; a pin after a finisher is the
 * end of the show.
 */
export type PinStakes = 'EARLY' | 'MID' | 'LATE' | 'AFTER_SIGNATURE' | 'AFTER_FINISHER';

export interface PinContext {
  /** Landed a finisher this match. */
  finisherLanded: boolean;
  /** Landed a signature since the last cover. */
  signatureLanded: boolean;
  /** 0..1 through the match clock. */
  matchProgress: number;
}

/** Multiplies the escape zone. Smaller means harder to kick out. */
const STAKES_SCALE: Record<PinStakes, number> = {
  EARLY: 2.4,
  MID: 1.35,
  LATE: 1.0,
  AFTER_SIGNATURE: 0.7,
  AFTER_FINISHER: 0.34,
};

export class PinSystem {
  static canPin(attacker: Fighter, defender: Fighter): boolean {
    if (!defender.isDown) return false;
    if (attacker.isDown || attacker.isBusy) return false;
    if (defender.healthFrac > TUNING.pin.maxHealthFrac && !defender.exhausted) return false;
    return attacker.distanceTo(defender) <= TUNING.pin.range;
  }

  /**
   * Reads the stage of the match. This is what makes a three-count mean
   * something: two basic moves can never produce one, and a finisher almost
   * always does.
   */
  static stakes(defender: Fighter, ctx: PinContext): PinStakes {
    if (ctx.finisherLanded) return 'AFTER_FINISHER';
    if (ctx.signatureLanded) return 'AFTER_SIGNATURE';
    if (ctx.matchProgress < 0.25 && defender.healthFrac > 0.4) return 'EARLY';
    if (defender.healthFrac > 0.28) return 'MID';
    return 'LATE';
  }

  static begin(defender: Fighter, ctx: PinContext): PinState {
    const stakes = PinSystem.stakes(defender, ctx);
    const half = PinSystem.zoneHalf(defender, stakes);
    return {
      count: 0,
      marker: 0,
      zoneCenter: 0.5,
      zoneHalf: half,
      liveHalf: half * COUNT_ZONE_SCALE[0]!,
      attemptUsed: false,
      lastAttemptHit: null,
      elapsed: 0,
      stakes,
    };
  }

  static zoneHalf(defender: Fighter, stakes: PinStakes): number {
    const t = clamp(defender.healthFrac / TUNING.pin.maxHealthFrac, 0, 1);
    const base = TUNING.pin.zoneAtZeroHealth
      + (TUNING.pin.zoneAtFullHealth - TUNING.pin.zoneAtZeroHealth) * t;
    const scaled = base * STAKES_SCALE[stakes];
    return defender.exhausted ? scaled * 0.45 : scaled;
  }

  /** Advances one count. Returns 'escape', 'pinned' or null to continue. */
  static update(
    p: PinState, dt: number, defender: Fighter, tapped: boolean,
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
      p.zoneHalf = PinSystem.zoneHalf(defender, p.stakes);
      p.liveHalf = p.zoneHalf
        * COUNT_ZONE_SCALE[Math.min(p.count, COUNT_ZONE_SCALE.length - 1)]!;
      if (p.count >= 3) return 'pinned';
    }
    return null;
  }
}
