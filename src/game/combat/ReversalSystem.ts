import { FS } from './states';
import type { Fighter } from './Fighter';
import { TUNING } from '@/game/config/tuning';

/**
 * The v2.0 reversal (Bible s9.3).
 *
 * When an opponent commits to a reversible attack within range, the defender's
 * HUD shows one large cue and a correctly timed ATTACK tap reverses it. There is
 * no chord and no hold. Tapping with no cue armed costs a short lockout, so
 * mashing ATTACK is not a free defence.
 */
export class ReversalSystem {
  /** Difficulty scales the window the AI gets, never the player's. */
  static arm(defender: Fighter, attacker: Fighter, windowScale = 1): void {
    const a = attacker.action;
    if (!a || attacker.state !== FS.ATTACK || a.hasHit) { defender.reversalArmed = false; return; }
    if (a.move.reversible === false || a.move.cinematic) { defender.reversalArmed = false; return; }
    if (defender.isBusy && defender.state !== FS.STUN) { defender.reversalArmed = false; return; }
    if (defender.state === FS.STUN || defender.isDown) { defender.reversalArmed = false; return; }

    const dist = defender.distanceTo(attacker);
    if (dist > a.move.reach + defender.cfg.stats.radius + 0.6) { defender.reversalArmed = false; return; }

    const window = TUNING.reversal.windowMs * defender.cfg.stats.reversal * windowScale;
    const untilActive = a.move.startupMs - a.elapsed;
    // Armed from `window` ms before the active frames until the attack lands.
    if (untilActive <= window && untilActive > -a.move.activeMs) {
      defender.reversalArmed = true;
      defender.reversalRemaining = Math.max(0, untilActive + a.move.activeMs);
    } else {
      defender.reversalArmed = false;
    }
  }

  /**
   * Consumes an ATTACK press. Returns true if it was spent on a reversal, so the
   * fighter's own attack does not also come out.
   */
  static tryReverse(defender: Fighter, attacker: Fighter, heat01: number): boolean {
    if (defender.reversalLockout > 0) return false;
    if (!defender.reversalArmed) {
      // Only punish a whiffed defensive tap when an attack is actually incoming.
      if (attacker.state === FS.ATTACK) {
        defender.reversalLockout = TUNING.reversal.whiffLockoutMs;
        defender.events.push({ type: 'reversalWhiff' });
      }
      return false;
    }

    defender.reversalArmed = false;
    defender.action = null;
    defender.setState(FS.REVERSAL);
    defender.invuln = TUNING.reversal.defenderInvulnMs;
    defender.addIt(TUNING.reversal.itGain, heat01);

    attacker.action = null;
    attacker.stun(TUNING.reversal.attackerStunMs);
    const away = defender.facing + Math.PI;
    attacker.vx += Math.cos(away) * -4.2;
    attacker.vz += Math.sin(away) * -4.2;
    return true;
  }
}
