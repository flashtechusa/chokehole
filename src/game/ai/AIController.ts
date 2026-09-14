import type { Fighter } from '@/game/combat/Fighter';
import type { PinState } from '@/game/combat/PinSystem';
import type { Intent } from '@/game/input/Intent';
import { neutralIntent } from '@/game/input/Intent';
import { FS } from '@/game/combat/states';
import { RING, nearestCorner } from '@/game/combat/ring';
import { TUNING } from '@/game/config/tuning';
import type { AIProfile } from './profiles';
import type { Rng } from '@/game/util/rng';

type Plan =
  | 'APPROACH' | 'STRIKE' | 'GRAB' | 'SPECIAL' | 'SPACE' | 'TAUNT' | 'PIN'
  | 'CAN' | 'PROP' | 'ROPES' | 'CLIMB' | 'CHASE_OUTSIDE';

interface Spot { x: number; z: number }

/**
 * Produces the same Intent the touch pad produces, so the AI is physically
 * incapable of anything the player cannot do.
 *
 * It also has to be entertaining, not just competent: it runs the ropes, climbs
 * the turnbuckle, goes after the props and plays to the crowd, because a
 * spectacle game where only one side does spectacle is half a game.
 */
export class AIController {
  readonly profile: AIProfile;
  private rng: Rng;
  private plan: Plan = 'APPROACH';
  private thinkTimer = 0;
  private planTime = 0;
  private reactTimer = 0;
  private lastThreat = '';
  private mashTimer = 0;
  private tapTimer = 0;
  private pinAttemptDone = false;
  private can: Spot | null = null;
  private prop: Spot | null = null;

  constructor(profile: AIProfile, rng: Rng) {
    this.profile = profile;
    this.rng = rng;
  }

  setPickups(can: Spot | null, prop: Spot | null): void {
    this.can = can;
    this.prop = prop;
  }

  update(dt: number, me: Fighter, foe: Fighter): Intent {
    const it = neutralIntent();
    this.thinkTimer -= dt;
    this.planTime += dt;
    this.mashTimer -= dt;
    this.tapTimer -= dt;

    const dx = foe.x - me.x;
    const dz = foe.z - me.z;
    const dist = Math.hypot(dx, dz);
    const toFoeX = dist > 0.001 ? dx / dist : 1;
    const toFoeZ = dist > 0.001 ? dz / dist : 0;

    // --- mashing out of holds and knockdowns ---
    if (me.state === FS.GRAPPLED || me.state === FS.DOWN || me.state === FS.DRAGGED) {
      if (this.mashTimer <= 0 && this.rng.chance(this.profile.mashRate)) {
        this.mashTimer = 120;
        it.attack = true;
        it.anyPress = true;
      }
      return it;
    }

    // --- holding someone: pick a destination worth throwing them at ---
    if (me.state === FS.GRAPPLING || me.state === FS.DRAGGING) {
      if (this.planTime > 300) {
        this.planTime = 0;
        if ((me.canFinish || me.canSignature) && this.rng.chance(this.profile.specialEagerness)) {
          it.special = true; it.anyPress = true;
          return it;
        }
        const roll = this.rng.next();
        if (roll < 0.3) {
          // whip into the ropes and meet them coming back
          const away = nearestRopeDir(me.x, me.z);
          it.moveX = away.x; it.moveY = away.z;
          it.grab = true;
        } else if (roll < 0.52) {
          const c = nearestCorner(foe.x, foe.z).corner;
          const d = norm(c.x - me.x, c.z - me.z);
          it.moveX = d.x; it.moveY = d.z;
          it.attack = true;
        } else if (roll < 0.66 && this.profile.aggression > 0.6) {
          const away = nearestRopeDir(me.x, me.z);
          it.moveX = away.x * 1.2; it.moveY = away.z * 1.2;
          it.attack = true;
        } else {
          it.attack = true;
        }
        it.anyPress = true;
      }
      return it;
    }

    // --- on the turnbuckle: commit ---
    if (me.state === FS.PERCH) {
      if (this.planTime > 420) {
        this.planTime = 0;
        // Dive if they are roughly under us, otherwise climb down.
        if (dist < 5.2 || foe.outside) { it.attack = true; } else { it.grab = true; }
        it.anyPress = true;
      }
      return it;
    }

    if (me.state === FS.APRON) {
      if (this.tapTimer <= 0) {
        this.tapTimer = 300;
        it.grab = true; it.anyPress = true;
      }
      return it;
    }

    // --- rope running: pick the payoff ---
    if (me.state === FS.ROPE_RUN) {
      if (dist < 2.4 || me.stateTime > 900) {
        if (this.tapTimer <= 0) {
          this.tapTimer = 300;
          if (foe.outside) it.attack = true;
          else if (this.rng.chance(this.profile.grabChance)) it.grab = true;
          else it.attack = true;
          it.anyPress = true;
        }
      }
      return it;
    }

    if (me.isBusy) return it;

    // --- reversal: react to a telegraphed attack, with a delay ---
    if (me.reversalArmed) {
      const id = foe.action ? `${foe.action.move.id}:${Math.floor(foe.action.elapsed / 60)}` : '';
      if (id !== this.lastThreat) {
        this.lastThreat = id;
        this.reactTimer = this.profile.reactionMs * this.rng.range(0.75, 1.3);
      }
      this.reactTimer -= dt;
      if (this.reactTimer <= 0 && this.rng.chance(this.profile.reversalChance)) {
        it.attack = true; it.anyPress = true;
        return it;
      }
    }

    if (this.thinkTimer <= 0) {
      this.thinkTimer = this.profile.thinkMs * this.rng.range(0.7, 1.3);
      this.plan = this.choosePlan(me, foe, dist);
      this.planTime = 0;
    }

    switch (this.plan) {
      case 'APPROACH': {
        const closeAt = me.cfg.moves.light1.reach * 0.7;
        if (dist > closeAt) { it.moveX = toFoeX; it.moveY = toFoeZ; }
        else if (this.tapTimer <= 0) { this.tapTimer = 240; it.attack = true; it.anyPress = true; }
        break;
      }
      case 'STRIKE': {
        const closeAt = me.cfg.moves.light1.reach * 0.82;
        if (dist > closeAt) { it.moveX = toFoeX * 0.9; it.moveY = toFoeZ * 0.9; }
        if (dist <= closeAt && this.tapTimer <= 0) {
          this.tapTimer = 230; it.attack = true; it.anyPress = true;
        }
        break;
      }
      case 'GRAB': {
        if (dist > me.cfg.moves.grapple.reach * 0.8) { it.moveX = toFoeX; it.moveY = toFoeZ; }
        else if (this.tapTimer <= 0) { this.tapTimer = 420; it.grab = true; it.anyPress = true; }
        break;
      }
      case 'SPECIAL':
        if (dist > me.cfg.moves.signature.reach * 0.7) { it.moveX = toFoeX; it.moveY = toFoeZ; }
        else if (this.tapTimer <= 0) { this.tapTimer = 500; it.special = true; it.anyPress = true; }
        break;
      case 'PIN':
        if (dist > TUNING.pin.range * 0.7) { it.moveX = toFoeX; it.moveY = toFoeZ; }
        else if (this.tapTimer <= 0) { this.tapTimer = 320; it.grab = true; it.anyPress = true; }
        break;
      case 'ROPES': {
        // Sprint at the nearest rope away from the opponent, then rebound back.
        const d = ropeAwayFrom(me.x, me.z, toFoeX, toFoeZ);
        it.moveX = d.x; it.moveY = d.z;
        break;
      }
      case 'CLIMB': {
        const c = nearestCorner(me.x, me.z);
        if (c.dist > RING.cornerR * 0.7) {
          const d = norm(c.corner.x - me.x, c.corner.z - me.z);
          it.moveX = d.x * 0.6; it.moveY = d.z * 0.6;
        } else if (this.tapTimer <= 0) {
          this.tapTimer = 420; it.grab = true; it.anyPress = true;
        }
        break;
      }
      case 'CHASE_OUTSIDE': {
        it.moveX = toFoeX; it.moveY = toFoeZ;
        if (dist < 1.6 && this.tapTimer <= 0) {
          this.tapTimer = 260; it.attack = true; it.anyPress = true;
        }
        break;
      }
      case 'CAN': case 'PROP': {
        const target = this.plan === 'CAN' ? this.can : this.prop;
        if (!target) { this.plan = 'APPROACH'; break; }
        const d = norm(target.x - me.x, target.z - me.z);
        it.moveX = d.x; it.moveY = d.z;
        break;
      }
      case 'TAUNT':
        if (this.tapTimer <= 0) { this.tapTimer = 900; it.special = true; it.anyPress = true; }
        break;
      case 'SPACE': {
        it.moveX = -toFoeZ * 0.7 - toFoeX * 0.25;
        it.moveY = toFoeX * 0.7 - toFoeZ * 0.25;
        break;
      }
    }
    return it;
  }

  private choosePlan(me: Fighter, foe: Fighter, dist: number): Plan {
    const p = this.profile;

    // Carrying something: use it, but a downed and pinnable opponent still
    // matters more than another swing.
    if (me.carrying) {
      if (foe.isDown && (foe.healthFrac <= TUNING.pin.maxHealthFrac || foe.exhausted)
        && this.rng.chance(p.pinEagerness)) return 'PIN';
      return 'STRIKE';
    }

    if (foe.outside) {
      if (me.outside) return dist < 2.4 ? 'STRIKE' : 'CHASE_OUTSIDE';
      // Someone on the floor is an invitation to do something stupid.
      if (this.rng.chance(p.spectacle * 0.8)) return 'CLIMB';
      if (this.rng.chance(p.spectacle)) return 'ROPES';
      return 'CHASE_OUTSIDE';
    }

    if (foe.isDown) {
      const pinnable = foe.healthFrac <= TUNING.pin.maxHealthFrac || foe.exhausted;
      if (pinnable && this.rng.chance(p.pinEagerness)) return 'PIN';
      // A downed opponent is the best time to climb, and to gloat.
      if (this.rng.chance(p.spectacle * 0.7)) return 'CLIMB';
      if (this.rng.chance(p.tauntChance * 2.5)) return 'TAUNT';
      if (dist < me.cfg.moves.ground.reach && this.rng.chance(0.55)) return 'STRIKE';
      return 'SPACE';
    }

    if (this.prop && !me.carrying && this.rng.chance(p.propChance)) return 'PROP';
    if (this.can && this.rng.chance(p.canChance)) return 'CAN';
    if ((me.canFinish || me.canSignature) && this.rng.chance(p.specialEagerness)) return 'SPECIAL';

    // The ropes are the AI's bread and butter at range: it should look like it
    // knows the ring is there.
    if (dist > 2.8 && this.rng.chance(p.spectacle)) return 'ROPES';
    if (dist < TUNING.combat.grappleRange * 1.4 && this.rng.chance(p.grabChance)) return 'GRAB';
    if (dist < 2.6) {
      const r = this.rng.next();
      if (r < 0.62 * p.aggression) return 'STRIKE';
      if (r < 0.86) return 'SPACE';
      return 'APPROACH';
    }
    if (dist > 4 && this.rng.chance(p.tauntChance)) return 'TAUNT';
    return this.rng.chance(p.aggression) ? 'APPROACH' : 'SPACE';
  }

  /**
   * The AI's single pin-escape attempt. It aims for the zone with an accuracy
   * set by difficulty, rather than being handed a guaranteed kickout.
   */
  pinEscapeTap(pin: PinState): boolean {
    if (pin.liveHalf <= 0) return false;
    if (!pin.attemptUsed) {
      if (this.pinAttemptDone) return false;
    } else {
      this.pinAttemptDone = false;
      return false;
    }
    const inZone = Math.abs(pin.marker - pin.zoneCenter) <= pin.liveHalf;
    const wants = inZone ? this.profile.pinSkill : (1 - this.profile.pinSkill) * 0.04;
    if (this.rng.chance(wants)) { this.pinAttemptDone = true; return true; }
    return false;
  }
}

function norm(x: number, z: number): { x: number; z: number } {
  const d = Math.hypot(x, z) || 1;
  return { x: x / d, z: z / d };
}

/** Unit vector at the nearest rope. */
function nearestRopeDir(x: number, z: number): { x: number; z: number } {
  return Math.abs(x) >= Math.abs(z)
    ? { x: Math.sign(x) || 1, z: 0 }
    : { x: 0, z: Math.sign(z) || 1 };
}

/** Sprint direction toward a rope that is not through the opponent. */
function ropeAwayFrom(
  x: number, z: number, toFoeX: number, toFoeZ: number,
): { x: number; z: number } {
  const options = [
    { x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 },
  ];
  let best = options[0]!;
  let bestScore = -Infinity;
  for (const o of options) {
    // Prefer a rope we are not already against and that is not straight at them.
    const room = o.x !== 0 ? RING.half - o.x * x : RING.half - o.z * z;
    const away = -(o.x * toFoeX + o.z * toFoeZ);
    const score = room * 0.7 + away * 1.6;
    if (score > bestScore) { bestScore = score; best = o; }
  }
  return best;
}
