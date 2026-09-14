import type { MoveDef } from './types';
import { FS, HITTABLE } from './states';
import { Fighter } from './Fighter';
import { TUNING } from '@/game/config/tuning';
import { RING } from './ring';

export interface HitReport {
  attacker: Fighter;
  defender: Fighter;
  move: MoveDef;
  damage: number;
  combo: number;
  /** True when the defender was caught coming off the ropes. */
  counter: boolean;
  /** Crowd interest in this move, 0..1, before this use. */
  fresh: number;
  /** Contact point in world space, for sparks and the camera punch. */
  x: number;
  y: number;
  z: number;
}

/**
 * Contact resolution, run once per frame after both fighters have updated.
 * Difficulty never touches damage or reach — only reaction timing (ai/profiles).
 */
export class CombatResolver {
  static resolve(attacker: Fighter, defender: Fighter, heat01: number): HitReport | null {
    const a = attacker.action;
    // AERIAL is an attacking state too: leaping moves live there for their whole
    // flight, and requiring ATTACK here silently rejected every dive in the game.
    const attacking = attacker.state === FS.ATTACK || attacker.state === FS.AERIAL;
    if (!a || !attacking || a.hasHit) return null;

    const m = a.move;
    const flying = m.leap !== undefined;
    /*
     * A leaping move stays live for its whole flight. Its `activeMs` window
     * closed hundreds of milliseconds before the body arrived, so every top-rope
     * dive passed straight through the opponent. The action is cleared on
     * landing, so there is no risk of it hanging around.
     */
    const activeEnd = flying ? Infinity : m.startupMs + m.activeMs;
    if (a.elapsed < m.startupMs || a.elapsed > activeEnd) return null;

    if (!a.guaranteed) {
      // Ground moves and dives are the two things that can hit someone lying down.
      const canHitDowned = m.kind === 'ground' || m.kind === 'aerial' || m.kind === 'dive';
      if (!HITTABLE.has(defender.state) && !(defender.isDown && canHitDowned)) return null;
      if (defender.invuln > 0) return null;

      const dx = defender.x - attacker.x;
      const dist = Math.abs(dx);
      if (dist > m.reach + defender.cfg.stats.radius) return null;

      /*
       * On a line a strike either lands in front of you or it does not: there
       * is no cone to be generous with. A body already in mid-air is committed
       * and cannot steer, so it is allowed to connect either way — otherwise a
       * dive that crossed over its target in flight would pass straight through.
       */
      if (!flying && dist > 0.02 && Math.sign(dx) !== attacker.dir) return null;

      if (m.kind === 'ground') {
        if (!defender.isDown) return null;
      } else if (flying) {
        // Diving onto someone means coming down on them from well above.
        if (Math.abs(defender.y - attacker.y) > 3.0) return null;
      } else if (Math.abs(defender.y - attacker.y) >= 1.4 || defender.isDown) {
        return null;
      }
    }

    a.hasHit = true;

    attacker.comboTimer = TUNING.combat.comboWindowMs;
    const chain = Math.max(0, attacker.comboIndex);
    const falloff = Math.pow(TUNING.combat.comboDamageFalloff, chain);
    attacker.bestCombo = Math.max(attacker.bestCombo, chain + 1);

    // A paired move that connects at range (a signature, a finisher) picks the
    // victim up into its choreography from the moment of contact.
    if (m.paired && !attacker.pairVictim) attacker.beginPair(defender, m);

    /*
     * Catching someone as they come back off the ropes. An Irish whip does five
     * damage on its own; this is what it is for, and it is why running the ring
     * beats standing still and trading.
     */
    const running = defender.state === FS.ROPE_RUN || defender.state === FS.WHIPPED;
    const counter = running && m.kind !== 'ground' ? TUNING.combat.runningCounterMult : 1;

    // The crowd has seen this before. Damage is untouched; interest is not.
    const fresh = attacker.consumeFreshness(m.id);

    const damage = defender.takeHit(m, attacker, falloff, counter);
    attacker.addIt(m.itGain * counter * fresh, heat01);

    return {
      attacker, defender, move: m, damage, combo: chain + 1, counter: counter > 1, fresh,
      x: attacker.x + attacker.dir * m.reach * 0.65,
      y: 1.05 + (m.kind === 'ground' ? -0.75 : 0),
      z: RING.playZ,
    };
  }

  /** Keeps bodies from occupying the same space. */
  static separate(a: Fighter, b: Fighter, dt: number): void {
    if (a.state === FS.GRAPPLING || a.state === FS.GRAPPLED) return;
    if (b.state === FS.GRAPPLING || b.state === FS.GRAPPLED) return;
    // On a line, two bodies can only ever be apart in one direction. That is
    // what stops them ever occupying the same screen space.
    const dx = b.x - a.x;
    const d = Math.abs(dx);
    const min = a.cfg.stats.radius + b.cfg.stats.radius;
    if (d >= min || d < 1e-4) return;
    const push = (min - d) / min * TUNING.move.pushForce * (dt / 1000);
    const nx = Math.sign(dx);
    a.x -= nx * push;
    b.x += nx * push;
  }
}
