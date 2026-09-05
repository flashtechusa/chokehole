import type { MoveDef } from '@/game/types';
import { TUNING } from '@/game/config/tuning';
import { FS, HITTABLE } from './states';
import { Fighter } from './Fighter';

export interface HitReport {
  attacker: Fighter;
  defender: Fighter;
  move: MoveDef;
  damage: number;
  blocked: boolean;
  reversed: boolean;
  combo: number;
  /** Screen-space-ish contact point in ring coordinates. */
  x: number;
  depth: number;
  z: number;
}

/**
 * Contact resolution. Runs once per frame after both fighters have updated.
 * The AI and the player go through exactly this code path — difficulty never
 * touches damage, only reaction timing (see ai/profiles.ts).
 */
export class CombatSystem {
  /** Resolves attacker -> defender contact, if any. */
  static resolve(attacker: Fighter, defender: Fighter, heat01: number): HitReport | null {
    const a = attacker.action;
    if (!a || attacker.state !== FS.ATTACK) return null;
    if (a.hasHit) return null;

    const m = a.move;
    const phaseStart = m.startup;
    const phaseEnd = m.startup + m.active;
    if (a.elapsed < phaseStart || a.elapsed > phaseEnd) return null;

    if (!HITTABLE.has(defender.state) && !a.guaranteed) return null;
    if (defender.invuln > 0) return null;

    const reach = m.reach * attacker.reachMult;
    const dx = defender.x - attacker.x;
    const facingRight = attacker.facing === 1;
    const inFront = facingRight ? dx > -18 : dx < 18;
    const withinX = Math.abs(dx) <= reach + TUNING.fighter.bodyRadius * 0.6;
    const dd = Math.abs(defender.depth - attacker.depth) * TUNING.ring.depthPixels;
    const withinDepth = dd <= m.depthTolerance;
    const withinZ = Math.abs(defender.z - attacker.z) < 120 || m.kind === 'finisher';

    if (!a.guaranteed && !(inFront && withinX && withinDepth && withinZ)) return null;

    a.hasHit = true;

    // --- reversal check -------------------------------------------------
    const window = TUNING.combat.reversalWindow * defender.cfg.stats.reversal;
    const facingAttacker = (defender.x >= attacker.x) === (attacker.facing === 1);
    const canReverse =
      defender.state === FS.BLOCK &&
      defender.blockAge <= window &&
      facingAttacker &&
      m.kind !== 'finisher';

    if (canReverse) {
      defender.setState(FS.REVERSAL);
      defender.addSquelsh(TUNING.meters.reversalSquelsh, heat01);
      defender.invuln = 320;
      attacker.action = null;
      attacker.stun(680);
      attacker.vx = -attacker.facing * 260;
      defender.vx = attacker.facing * 90;
      return {
        attacker, defender, move: m, damage: 0, blocked: false, reversed: true,
        combo: 0, x: (attacker.x + defender.x) / 2, depth: defender.depth, z: defender.z,
      };
    }

    // --- normal / blocked hit -------------------------------------------
    const blocked = defender.state === FS.BLOCK;
    attacker.comboTimer = TUNING.combat.comboWindow;
    attacker.comboCount = blocked ? attacker.comboCount : attacker.comboCount + 1;
    const falloff = Math.pow(TUNING.combat.comboDamageFalloff, Math.max(0, attacker.comboCount - 1));

    const scaled: MoveDef = { ...m, damage: m.damage * falloff };
    const dealt = defender.takeHit(scaled, attacker, blocked);
    attacker.addSquelsh(m.squelsh * (blocked ? 0.4 : 1), heat01);

    return {
      attacker, defender, move: m, damage: dealt, blocked, reversed: false,
      combo: attacker.comboCount,
      x: attacker.x + attacker.facing * reach * 0.7,
      depth: defender.depth,
      z: defender.z + 46,
    };
  }
}
