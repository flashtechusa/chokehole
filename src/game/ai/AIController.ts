import type { Fighter } from '@/game/combat/Fighter';
import type { PinState } from '@/game/combat/PinSystem';
import type { Intent } from '@/game/input/Intent';
import { neutralIntent } from '@/game/input/Intent';
import { FS } from '@/game/combat/states';
import { RING, cornerX, inCorner } from '@/game/combat/ring';
import { TUNING } from '@/game/config/tuning';
import type { AIProfile } from './profiles';
import type { Rng } from '@/game/util/rng';

type Plan =
  | 'APPROACH' | 'STRIKE' | 'GRAB' | 'SPECIAL' | 'SPACE' | 'TAUNT' | 'PIN'
  | 'CAN' | 'PROP' | 'ROPES' | 'CLIMB' | 'CHASE_OUTSIDE' | 'FLANK';

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
  /** Counts down while the AI is playing to the crowd over a downed opponent. */
  private respect = 0;
  private foeWasUp = true;
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
    this.respect -= dt;

    /*
     * Put someone on the mat and you have to let them up.
     *
     * The window starts when they go down and outlasts their get-up, so the
     * player stands into a turn of their own rather than into the next strike.
     * Everything theatrical stays legal during it -- taunting, climbing,
     * covering for the pin -- so the AI is milking the moment, not idling.
     */
    const foeUp = !foe.isDown && foe.state !== FS.THROWN;
    if (this.foeWasUp && !foeUp) this.respect = this.profile.respectMs;
    this.foeWasUp = foeUp;

    // One axis. The fight is on a line, so "toward the opponent" is a sign.
    const dx = foe.x - me.x;
    const dist = Math.abs(dx);
    const toFoeX = dist > 0.001 ? Math.sign(dx) : 1;

    /**
     * Facing now follows the stick for everyone, so the AI has to actually aim
     * itself before swinging — it can no longer rely on being magnetically
     * pointed at the player. A light push toward the target turns it without
     * meaningfully closing the gap.
     */
    const aim = (i: Intent, amount = 0.34): void => {
      i.moveX = toFoeX * amount;
    };

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
        const end = nearestEnd(me.x);
        if (roll < 0.34) {
          // Whip them at the near end and meet them coming back.
          it.moveX = end;
          it.grab = true;
        } else if (roll < 0.56) {
          // Bury them in the corner.
          it.moveX = end;
          it.attack = true;
        } else if (roll < 0.68 && this.profile.aggression > 0.6) {
          // Over the top rope, if there is any chance of reaching it.
          it.moveX = end; it.moveY = 1;
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

    /*
     * A flattened opponent interrupts whatever the plan was. Nobody keeps
     * stomping someone who cannot stand — they cover. Without this the AI ran
     * out the current plan while the knockout count expired underneath it, and
     * half the matches ended on health attrition instead of a three-count.
     */
    if ((foe.state === FS.WHIPPED || foe.state === FS.ROPE_RUN)
      && this.plan !== 'STRIKE' && !me.isBusy) {
      // Someone coming back off the ropes is the best target in the game. It is
      // also the whole reason to spend a grapple on a whip.
      this.plan = 'STRIKE';
      this.planTime = 0;
      this.thinkTimer = this.profile.thinkMs * 0.5;
    } else if (foe.exhausted && foe.isDown && this.plan !== 'PIN' && !me.isBusy) {
      this.plan = 'PIN';
      this.planTime = 0;
      this.thinkTimer = this.profile.thinkMs;
    } else if (this.thinkTimer <= 0) {
      this.thinkTimer = this.profile.thinkMs * this.rng.range(0.7, 1.3);
      this.plan = this.choosePlan(me, foe, dist);
      this.planTime = 0;
    }

    switch (this.plan) {
      case 'APPROACH': {
        const closeAt = me.cfg.moves.light1.reach * 0.7;
        if (dist > closeAt) { it.moveX = toFoeX; }
        else if (this.tapTimer <= 0) { this.tapTimer = 240; aim(it); it.attack = true; it.anyPress = true; }
        break;
      }
      case 'STRIKE': {
        const closeAt = me.cfg.moves.light1.reach * 0.82;
        if (dist > closeAt) { it.moveX = toFoeX * 0.9; }
        if (dist <= closeAt && this.tapTimer <= 0) {
          this.tapTimer = 230; aim(it); it.attack = true; it.anyPress = true;
        }
        break;
      }
      case 'GRAB': {
        if (dist > me.cfg.moves.grapple.reach * 0.8) { it.moveX = toFoeX; }
        else if (this.tapTimer <= 0) { this.tapTimer = 420; aim(it); it.grab = true; it.anyPress = true; }
        break;
      }
      case 'SPECIAL':
        if (dist > me.cfg.moves.signature.reach * 0.7) { it.moveX = toFoeX; }
        else if (this.tapTimer <= 0) { this.tapTimer = 500; aim(it); it.special = true; it.anyPress = true; }
        break;
      case 'PIN':
        if (dist > TUNING.pin.range * 0.7) { it.moveX = toFoeX; }
        else if (this.tapTimer <= 0) { this.tapTimer = 320; aim(it); it.grab = true; it.anyPress = true; }
        break;
      case 'ROPES': {
        // Sprint at the end away from the opponent, then rebound back at them.
        it.moveX = ropeAwayFrom(me.x, toFoeX);
        break;
      }
      case 'CLIMB': {
        if (!inCorner(me.x)) {
          it.moveX = Math.sign(cornerX(me.x) - me.x) * 0.6;
        } else if (this.tapTimer <= 0) {
          this.tapTimer = 420; it.grab = true; it.anyPress = true;
        }
        break;
      }
      case 'CHASE_OUTSIDE': {
        it.moveX = toFoeX;
        if (dist < 1.6 && this.tapTimer <= 0) {
          this.tapTimer = 260; aim(it); it.attack = true; it.anyPress = true;
        }
        break;
      }
      case 'CAN': case 'PROP': {
        const target = this.plan === 'CAN' ? this.can : this.prop;
        if (!target) { this.plan = 'APPROACH'; break; }
        it.moveX = Math.sign(target.x - me.x) || 1;
        break;
      }
      case 'TAUNT':
        if (this.tapTimer <= 0) { this.tapTimer = 900; it.special = true; it.anyPress = true; }
        break;
      case 'FLANK': {
        /*
         * Circle round to the opponent's back, then take the waistlock. This
         * exists to show the player that turning matters: being grabbed from
         * behind teaches it faster than any tutorial card.
         */
        const behindX = foe.x - foe.dir * 1.0;
        const toBehind = Math.sign(behindX - me.x) || 1;
        const gap = Math.abs(behindX - me.x);
        if (gap > 0.55) { it.moveX = toBehind; }
        else if (this.tapTimer <= 0) {
          this.tapTimer = 420; aim(it); it.grab = true; it.anyPress = true;
        }
        break;
      }
      case 'SPACE': {
        // On a line there is one way to make space: back off, unless that
        // means backing into a corner, in which case walk past them instead.
        const away = -toFoeX;
        it.moveX = RING.half - away * me.x > 1.2 ? away * 0.8 : toFoeX * 0.9;
        break;
      }
    }
    return it;
  }

  private choosePlan(me: Fighter, foe: Fighter, dist: number): Plan {
    const p = this.profile;
    const respecting = this.respect > 0;

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
      if (respecting) return this.rng.chance(0.4) ? 'TAUNT' : 'SPACE';
      if (dist < me.cfg.moves.ground.reach && this.rng.chance(0.55)) return 'STRIKE';
      return 'SPACE';
    }

    // They are back on their feet but the window has not run out: keep showing
    // off rather than jumping straight back on them.
    if (respecting) {
      if ((me.canFinish || me.canSignature) && this.rng.chance(p.specialEagerness * 0.5)) {
        return 'SPECIAL';
      }
      if (this.rng.chance(p.spectacle * 0.6)) return 'ROPES';
      if (this.rng.chance(0.3)) return 'TAUNT';
      return 'SPACE';
    }

    if (this.prop && !me.carrying && this.rng.chance(p.propChance)) return 'PROP';
    if (this.can && this.rng.chance(p.canChance)) return 'CAN';
    if ((me.canFinish || me.canSignature) && this.rng.chance(p.specialEagerness)) return 'SPECIAL';

    // The ropes are the AI's bread and butter at range: it should look like it
    // knows the ring is there.
    if (dist > 2.8 && this.rng.chance(p.spectacle)) return 'ROPES';
    // Someone facing away is asking to be taken from behind.
    if (dist < 3.2 && this.rng.chance(p.flankChance)) return 'FLANK';
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

/** Which end of the line this body is nearer: -1 left, +1 right. */
function nearestEnd(x: number): number {
  return Math.sign(x) || 1;
}

/**
 * Which end to sprint at. There are only two, so the choice is: take the one
 * AWAY from the opponent when there is room to build up speed, otherwise the
 * other one. Running at a rope you are already against does nothing.
 */
function ropeAwayFrom(x: number, toFoeX: number): number {
  const away = -Math.sign(toFoeX) || 1;
  const roomAway = RING.half - away * x;
  return roomAway > 1.6 ? away : -away;
}
