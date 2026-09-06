import { TUNING } from '@/game/config/tuning';
import type { Fighter } from '@/game/combat/Fighter';
import { FS } from '@/game/combat/states';
import type { Intent } from '@/game/input/Intent';
import { neutralIntent } from '@/game/input/Intent';
import type { AIProfile } from './profiles';

type Plan = 'APPROACH' | 'STRIKE' | 'HEAVY' | 'GRAPPLE' | 'SPECIAL' | 'BLOCK' | 'SPACE' | 'TAUNT' | 'PIN';

/**
 * Produces an Intent, exactly like the touch pad does. It cannot see anything
 * the player cannot see, and it cannot perform any action the player cannot.
 */
export class AIController {
  private profile: AIProfile;
  private plan: Plan = 'APPROACH';
  private planTime = 0;
  private thinkTimer = 0;
  private reactTimer = 0;
  private heavyHold = 0;
  private mashTimer = 0;
  private lastThreatId = '';

  constructor(profile: AIProfile) {
    this.profile = profile;
  }

  setProfile(p: AIProfile): void {
    this.profile = p;
  }

  update(dtMs: number, me: Fighter, foe: Fighter, matchLive: boolean): Intent {
    const it = neutralIntent();
    if (!matchLive) return it;

    this.planTime += dtMs;
    this.thinkTimer -= dtMs;
    this.mashTimer -= dtMs;

    const dx = foe.x - me.x;
    const dist = Math.abs(dx);
    const dd = (foe.depth - me.depth) * TUNING.ring.depthPixels;
    const dir = Math.sign(dx) || 1;

    // --- mashing out of holds and pins ---------------------------------
    if (me.state === FS.GRAPPLED || me.state === FS.DOWN || me.state === FS.PINNED) {
      if (this.mashTimer <= 0 && Math.random() < this.profile.mashRate) {
        this.mashTimer = 110;
        it.anyPress = true;
        it.strike = true;
      }
      return it;
    }

    // --- grapple offence -----------------------------------------------
    if (me.state === FS.GRAPPLING) {
      if (this.planTime > 260) {
        this.planTime = 0;
        if ((me.canSignature || me.canFinish) && Math.random() < this.profile.specialEagerness) {
          it.special = true;
        } else if (Math.random() < 0.55) {
          it.strike = true; it.strikeRelease = true; it.anyPress = true;
        } else {
          it.grapple = true; it.anyPress = true;
        }
      }
      return it;
    }

    if (me.isBusy && me.state !== FS.BLOCK) return it;

    // --- threat reaction (same reversal window the player gets) ---------
    const threat = this.readThreat(foe);
    if (threat) {
      if (threat.id !== this.lastThreatId) {
        this.lastThreatId = threat.id;
        this.reactTimer = this.profile.reactionMs * (0.75 + Math.random() * 0.5);
      }
      this.reactTimer -= dtMs;
      // The profile's blockChance is the whole probability. A flat bonus used to
      // be added here, which put NORMAL at 0.7 and made the reactive block an
      // effectively automatic reversal: measured at 17% of the player's attacks
      // being reversed, each costing 680ms of stun.
      const wantsBlock = Math.random() < this.profile.blockChance;
      if (this.reactTimer <= 0 && wantsBlock && dist < 150 && threat.remaining < 240) {
        it.block = true;
        it.strikeHeld = true;
        it.grappleHeld = true;
        return it;
      }
    } else {
      this.lastThreatId = '';
    }

    // --- pick a plan ----------------------------------------------------
    if (this.thinkTimer <= 0) {
      this.thinkTimer = this.profile.thinkMs * (0.7 + Math.random() * 0.6);
      this.plan = this.choosePlan(me, foe, dist);
      this.planTime = 0;
    }

    // --- execute --------------------------------------------------------
    const closeEnough = dist < me.cfg.moves.light.reach * 0.85;
    switch (this.plan) {
      case 'APPROACH': {
        if (!closeEnough) it.moveX = dir * (this.profile.aggression > 0.8 ? 1 : 0.75);
        if (Math.abs(dd) > 16) it.moveY = Math.sign(dd) * 0.7;
        break;
      }
      case 'SPACE': {
        it.moveX = -dir * 0.8;
        if (Math.abs(dd) > 10) it.moveY = -Math.sign(dd) * 0.6;
        break;
      }
      case 'STRIKE': {
        if (!closeEnough) { it.moveX = dir * 0.9; break; }
        if (this.planTime > 80) {
          it.strike = true; it.strikeRelease = true; it.anyPress = true;
          this.plan = 'APPROACH'; this.thinkTimer = 140;
        }
        break;
      }
      case 'HEAVY': {
        if (dist > me.cfg.moves.heavy.reach) { it.moveX = dir * 0.9; break; }
        this.heavyHold += dtMs;
        it.strike = this.heavyHold < dtMs + 1;
        it.strikeHeld = true;
        it.anyPress = it.strike;
        if (this.heavyHold > TUNING.combat.heavyChargeMs + 60) {
          this.heavyHold = 0; this.plan = 'APPROACH'; this.thinkTimer = 220;
        }
        break;
      }
      case 'GRAPPLE': {
        if (dist > TUNING.combat.grappleRange * 0.9 || Math.abs(dd) > 30) {
          it.moveX = dir * 1;
          if (Math.abs(dd) > 14) it.moveY = Math.sign(dd) * 0.8;
          break;
        }
        it.grapple = true; it.anyPress = true;
        this.plan = 'APPROACH'; this.thinkTimer = 320;
        break;
      }
      case 'SPECIAL': {
        const reach = me.canFinish ? me.cfg.moves.finisher.reach : me.cfg.moves.signature.reach;
        if (dist > reach * 0.8) { it.moveX = dir * 1; break; }
        if (Math.abs(dd) > 26) { it.moveY = Math.sign(dd) * 0.8; break; }
        it.special = true; it.anyPress = true;
        this.plan = 'APPROACH'; this.thinkTimer = 420;
        break;
      }
      case 'PIN': {
        if (dist > TUNING.combat.pinRange * 0.7 || Math.abs(dd) > 26) {
          it.moveX = dir * 1;
          if (Math.abs(dd) > 14) it.moveY = Math.sign(dd) * 0.9;
          break;
        }
        it.grapple = true; it.anyPress = true;
        this.thinkTimer = 260;
        break;
      }
      case 'BLOCK': {
        it.block = true; it.strikeHeld = true; it.grappleHeld = true;
        break;
      }
      case 'TAUNT': {
        it.special = true; it.anyPress = true;
        this.plan = 'APPROACH';
        this.thinkTimer = 900;
        break;
      }
    }

    return it;
  }

  private choosePlan(me: Fighter, foe: Fighter, dist: number): Plan {
    const p = this.profile;

    if (foe.isDown) {
      const hurt = foe.healthFrac < TUNING.combat.pinDangerHealth || foe.exhausted;
      if (hurt && Math.random() < p.pinEagerness) return 'PIN';
      return 'SPACE';
    }
    if ((me.canFinish || me.canSignature) && Math.random() < p.specialEagerness) return 'SPECIAL';

    if (dist < TUNING.combat.grappleRange && Math.random() < p.grappleChance) return 'GRAPPLE';

    if (dist < 120) {
      const r = Math.random();
      if (r < 0.5 * p.aggression) return 'STRIKE';
      if (r < 0.72 * p.aggression) return 'HEAVY';
      if (r < 0.72) return 'BLOCK';
      return 'SPACE';
    }
    if (dist > 300 && Math.random() < p.tauntChance) return 'TAUNT';
    return Math.random() < p.aggression ? 'APPROACH' : 'SPACE';
  }

  /** Reads the opponent's telegraphed startup — visible information only. */
  private readThreat(foe: Fighter): { id: string; remaining: number } | null {
    if (foe.state === FS.ATTACK && foe.action) {
      const rem = foe.action.move.startup - foe.action.elapsed;
      if (rem > 0) return { id: `${foe.action.move.id}:${Math.floor(foe.action.elapsed)}`, remaining: rem };
    }
    if (foe.chargeRatio > 0.25) return { id: 'charge', remaining: 120 };
    return null;
  }
}
