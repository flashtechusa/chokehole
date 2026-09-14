import type { WrestlerConfig } from '@/game/characters/types';
import type { MoveDef, PropDef, SquelshEffect, TauntDef, Zone } from './types';
import type { Intent } from '@/game/input/Intent';
import { stickMagnitude } from '@/game/input/Intent';
import { TUNING } from '@/game/config/tuning';
import { ACTIONABLE, FS, GROUNDED, LOCKED } from './states';
import {
  RING, clampFloor, clampMat, groundAt, inCorner, insideRing, isBehind, nearestCorner,
  onApron, ropeAhead, zoneAt,
} from './ring';
import { angleDelta, approachAngle, clamp } from '@/game/util/math';

export interface ActiveAction {
  move: MoveDef;
  elapsed: number;
  hasHit: boolean;
  /** Grapple follow-ups skip the range check: contact is already established. */
  guaranteed: boolean;
  /** True once a committed leap has left the ground. */
  launched: boolean;
}

export type FighterEvent =
  | { type: 'move'; move: MoveDef }
  | { type: 'whiff'; move: MoveDef }
  | { type: 'taunt'; taunt: TauntDef }
  | { type: 'grappleLock' }
  | { type: 'grappleBreak' }
  | { type: 'squelsh'; effect: SquelshEffect }
  | { type: 'getUp' }
  | { type: 'wantsPin' }
  | { type: 'ropeRun' }
  | { type: 'rebound' }
  | { type: 'climb' }
  | { type: 'perch' }
  | { type: 'leftRing' }
  | { type: 'enteredRing' }
  | { type: 'landed'; hard: boolean }
  | { type: 'propTaken'; prop: PropDef }
  | { type: 'propDropped' }
  | { type: 'propBroke' }
  | { type: 'footstep'; running: boolean }
  | { type: 'reversalWhiff' };

/**
 * Pure-logic wrestler. Owns position on and around the ring, the state machine,
 * meters and timers. Imports no renderer.
 *
 * Almost every action is CONTEXTUAL: the same two buttons produce about twenty
 * different moves depending on where you are standing and what your opponent is
 * doing. That is what keeps a phone control scheme to three buttons while the
 * move list stays big enough to be worth showing someone.
 */
export class Fighter {
  readonly cfg: WrestlerConfig;
  readonly side: 1 | -1;

  // --- transform: XZ is the ground plane, y is absolute world height ---
  x = 0;
  z = 0;
  y = TUNING.ring.matY;
  vx = 0;
  vz = 0;
  vy = 0;
  /** Yaw in radians. 0 faces +X. */
  facing = 0;

  // --- state ---
  state: FS = FS.IDLE;
  stateTime = 0;
  action: ActiveAction | null = null;
  zone: Zone = 'MAT';

  // --- meters ---
  health: number;
  readonly maxHealth: number;
  it = 0;

  // --- combo ---
  comboIndex = 0;
  comboTimer = 0;
  bestCombo = 0;

  // --- reversal ---
  reversalArmed = false;
  reversalRemaining = 0;
  reversalLockout = 0;

  // --- squelsh ---
  squelsh: (SquelshEffect & { remaining: number }) | null = null;

  // --- props ---
  carrying: PropDef | null = null;
  /** Swings left before the prop gives out. Oversized props are not durable. */
  propUses = 0;
  /** Blocks re-taking a prop you just dropped, which was an instant loop. */
  propCooldown = 0;
  /**
   * Where the match is, as a damage multiplier. Set by MatchSim each frame so
   * the fight has an arc: feeling-out early, decisive late.
   */
  matchDamageScale = 1;

  // --- misc ---
  invuln = 0;
  hitFlash = 0;
  exhausted = false;
  /**
   * Time spent at zero health. Kept separately from stateTime because every
   * further hit resets the state machine, so a fighter being stomped while
   * flattened could never actually be counted out.
   */
  exhaustedMs = 0;
  stridePhase = 0;
  /** Set while rebounding off the ropes; drives the boosted run speed. */
  reboundBoost = 0;
  /** Direction locked in while running the ropes. */
  runDirX = 0;
  runDirZ = 0;
  /** Counts rope-to-rope trips, so the third is faster and louder. */
  ropeLaps = 0;
  /** After a bounce, the stick cannot cancel the run for this long. */
  private reboundGrace = 0;
  activeTaunt: TauntDef | null = null;
  /** Kickouts at the last possible count, tracked for the results card. */
  nearFalls = 0;

  // --- grapple ---
  grappleTimer = 0;
  grappleTaps = 0;
  partner: Fighter | null = null;
  /** True while this fighter is holding someone from behind. */
  rearHold = false;
  /**
   * The victim of a paired throw, carried through the choreography rather than
   * shoved with an impulse. Cleared at the move's release point.
   */
  pairVictim: Fighter | null = null;
  /** Set on the victim so the renderer knows to play the receiving clip. */
  pairClip: string | null = null;
  pairProgress = 0;

  // --- input buffering ---
  private pending: 'attack' | 'grab' | 'special' | null = null;
  private pendingAge = 0;

  readonly events: FighterEvent[] = [];

  constructor(cfg: WrestlerConfig, side: 1 | -1) {
    this.cfg = cfg;
    this.side = side;
    this.maxHealth = cfg.stats.health;
    this.health = cfg.stats.health;
    this.facing = side === 1 ? 0 : Math.PI;
  }

  /* ------------------------------------------------------------------ *
   * derived
   * ------------------------------------------------------------------ */

  get healthFrac(): number { return this.health / this.maxHealth; }
  get itFrac(): number { return this.it / TUNING.meters.itMax; }
  get canSignature(): boolean { return this.it >= TUNING.meters.signatureCost && !this.exhausted; }
  get canFinish(): boolean { return this.it >= TUNING.meters.finisherCost && !this.exhausted; }
  get isDown(): boolean { return GROUNDED.has(this.state); }
  get isBusy(): boolean { return LOCKED.has(this.state); }
  get groundY(): number { return groundAt(this.x, this.z); }
  get isAirborne(): boolean { return this.y > this.groundY + 0.04; }
  get outside(): boolean { return !insideRing(this.x, this.z) && !onApron(this.x, this.z); }
  get damageMult(): number { return this.cfg.stats.power * (this.squelsh?.damageMult ?? 1); }
  get damageTakenMult(): number { return this.squelsh?.damageTakenMult ?? 1; }
  get speedMult(): number { return this.squelsh?.speedMult ?? 1; }
  get itMult(): number { return this.cfg.stats.itGain * (this.squelsh?.itMult ?? 1); }

  get actionProgress(): number {
    const a = this.action;
    if (!a) return 0;
    const total = a.move.startupMs + a.move.activeMs + a.move.recoveryMs;
    return clamp(a.elapsed / total, 0, 1);
  }

  /* ------------------------------------------------------------------ *
   * state
   * ------------------------------------------------------------------ */

  setState(s: FS): void {
    if (this.state === s) return;
    this.state = s;
    this.stateTime = 0;
  }

  stun(ms: number): void {
    this.action = null;
    this.comboIndex = 0;
    this.activeTaunt = null;
    this.setState(FS.STUN);
    this.stateTime = -ms;
  }

  knockDown(launch = 3.2): void {
    this.action = null;
    this.partner = null;
    this.comboIndex = 0;
    this.activeTaunt = null;
    this.vy = launch;
    this.setState(FS.THROWN);
  }

  addIt(amount: number, heat01 = 0): void {
    if (amount <= 0) return;
    const heatBonus = 1 + heat01 * (TUNING.meters.heatItMult - 1);
    const gain = amount * TUNING.meters.itScale * this.itMult * heatBonus;
    this.it = clamp(this.it + gain, 0, TUNING.meters.itMax);
  }

  drinkSquelsh(effect: SquelshEffect): void {
    this.squelsh = { ...effect, remaining: effect.durationMs };
    this.events.push({ type: 'squelsh', effect });
  }

  takeProp(prop: PropDef): void {
    this.carrying = prop;
    this.propUses = TUNING.props.uses;
    this.events.push({ type: 'propTaken', prop });
  }

  dropProp(): void {
    if (!this.carrying) return;
    this.carrying = null;
    this.propUses = 0;
    this.propCooldown = 1400;
    this.events.push({ type: 'propDropped' });
  }

  /** Consumed by a swing. At zero the prop breaks rather than being dropped. */
  private spendProp(): void {
    this.propUses -= 1;
    if (this.propUses > 0) return;
    this.carrying = null;
    this.propUses = 0;
    this.events.push({ type: 'propBroke' });
  }

  /* ------------------------------------------------------------------ *
   * damage
   * ------------------------------------------------------------------ */

  takeHit(move: MoveDef, attacker: Fighter, comboFalloff: number): number {
    const dmg = move.damage * attacker.damageMult * this.damageTakenMult
      * comboFalloff * this.matchDamageScale;
    this.health = Math.max(0, this.health - dmg);
    this.hitFlash = 1;
    this.comboIndex = 0;
    this.reversalArmed = false;
    this.activeTaunt = null;
    if (this.carrying && move.damage > 12) this.dropProp();

    // Taking a beating is still a performance, but it pays far less than
    // actually entertaining the room.
    this.addIt(dmg * TUNING.meters.itOnDamageTaken);

    // A paired throw carries the victim; an impulse here would drag them out of
    // the choreography mid-move.
    if (attacker.pairVictim !== this) {
      const push = move.knockback;
      this.vx += Math.cos(attacker.facing) * push;
      this.vz += Math.sin(attacker.facing) * push;
    }

    if (this.health <= 0) {
      this.exhausted = true;
      this.knockDown(move.launch ?? 2.6);
      return dmg;
    }
    if (move.knockdown) this.knockDown(move.launch ?? 3.0);
    else this.stun(move.hitstunMs);
    return dmg;
  }

  /* ------------------------------------------------------------------ *
   * per-frame
   * ------------------------------------------------------------------ */

  update(dt: number, intent: Intent, opponent: Fighter, heat01: number): void {
    this.stateTime += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt / 180);
    this.invuln = Math.max(0, this.invuln - dt);
    this.reversalLockout = Math.max(0, this.reversalLockout - dt);
    this.reboundBoost = Math.max(0, this.reboundBoost - dt / 900);
    this.propCooldown = Math.max(0, this.propCooldown - dt);
    if (this.exhausted) this.exhaustedMs += dt;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.comboIndex = 0;
    }
    if (this.squelsh) {
      this.squelsh.remaining -= dt;
      if (this.squelsh.remaining <= 0) this.squelsh = null;
    }
    if (this.pending) {
      this.pendingAge += dt;
      if (this.pendingAge > TUNING.combat.bufferMs) this.pending = null;
    }

    this.zone = this.state === FS.PERCH ? 'PERCH' : zoneAt(this.x, this.z);
    this.updateFacing(dt, intent);

    switch (this.state) {
      case FS.ATTACK: this.updateAttack(dt); break;
      case FS.AERIAL: this.updateAerial(dt); break;
      case FS.STUN: this.updateStun(); break;
      case FS.REVERSAL: if (this.stateTime > 420) this.setState(FS.IDLE); break;
      case FS.ROPE_RUN: this.updateRopeRun(dt, intent, opponent, heat01); break;
      case FS.WHIPPED: this.updateWhipped(dt); break;
      case FS.CLIMB: this.updateClimb(dt); break;
      case FS.PERCH: this.updatePerch(dt, intent, opponent, heat01); break;
      case FS.APRON: this.updateApron(dt, intent, opponent, heat01); break;
      case FS.CORNERED: if (this.stateTime > 900) this.setState(FS.IDLE); break;
      case FS.GRAPPLE_START: this.updateGrappleStart(dt, opponent); break;
      case FS.GRAPPLING: this.updateGrappling(dt, intent, opponent, heat01); break;
      case FS.GRAPPLED: this.updateGrappled(intent); break;
      case FS.DRAGGING: this.updateDragging(dt, intent, opponent, heat01); break;
      case FS.DRAGGED: this.updateGrappled(intent); break;
      case FS.THROWN: this.updateThrown(); break;
      case FS.DOWN: this.updateDown(intent); break;
      case FS.GETUP:
        if (this.stateTime >= TUNING.combat.getUpMs) {
          this.invuln = TUNING.combat.getUpInvulnMs;
          this.setState(FS.IDLE);
        }
        break;
      case FS.TAUNT: this.updateTaunt(); break;
      case FS.PIN: case FS.PINNED: case FS.WIN: case FS.LOSE: case FS.ENTRANCE:
        break;
      default:
        this.updateFree(dt, intent, opponent, heat01);
    }

    this.integrate(dt);
  }

  /**
   * Facing follows the STICK, never the opponent.
   *
   * The fighter used to be magnetically rotated toward the other wrestler every
   * frame, which quietly removed half of wrestling: you could not turn your
   * back, run past someone, be grabbed from behind, or face the crowd. Now the
   * only automatic turning is toward your own movement, plus a single light
   * assist when an attack starts (see assistFacing).
   */
  private updateFacing(dt: number, intent: Intent): void {
    if (this.isDown || this.state === FS.PINNED || this.state === FS.PIN) return;

    const step = TUNING.move.turnRate * (dt / 1000);

    // Committed momentum states face where the body is actually going.
    if (this.state === FS.ROPE_RUN || this.state === FS.WHIPPED || this.state === FS.AERIAL) {
      const m = Math.hypot(this.vx, this.vz);
      if (m > 0.4) {
        this.facing = approachAngle(this.facing, Math.atan2(this.vz, this.vx), step * 1.6);
      }
      return;
    }

    // Anything else that locks the body also locks the facing.
    if (!ACTIONABLE.has(this.state)) return;

    const mag = Math.hypot(intent.moveX, intent.moveY);
    if (mag > 0.2) {
      this.facing = approachAngle(this.facing, Math.atan2(intent.moveY, intent.moveX), step);
    }
  }

  /**
   * Light target assistance, applied ONCE as a move starts. It nudges toward an
   * opponent who is already roughly in front and in range; it will not turn you
   * around, and it does nothing at all to someone behind you.
   */
  private assistFacing(opponent: Fighter, move: MoveDef): void {
    if (move.cinematic) return;
    const dist = this.distanceTo(opponent);
    if (dist > move.reach * TUNING.combat.assistRangeMult) return;
    const to = Math.atan2(opponent.z - this.z, opponent.x - this.x);
    const d = angleDelta(this.facing, to);
    if (Math.abs(d) > TUNING.combat.assistCone) return;
    this.facing += d * TUNING.combat.assistStrength;
  }

  private integrate(dt: number): void {
    // Being carried through someone else's throw overrides physics entirely.
    if (this.pairClip) return;

    const s = dt / 1000;
    const g = this.groundY;

    const windingUp = this.state === FS.AERIAL && this.action !== null && !this.action.launched;
    if (this.state === FS.PERCH || this.state === FS.CLIMB || windingUp) {
      /*
       * Held in place: on the turnbuckle, and through the startup frames of a
       * committed leap. Without the second case gravity pulls the fighter off
       * the top rope before the launch impulse is applied, so every top-rope
       * dive turned into a fall — the move existed but could never happen.
       */
      this.vx = 0; this.vz = 0; this.vy = 0;
    } else if (this.y > g || this.vy !== 0) {
      this.vy -= TUNING.move.gravity * s;
      this.y += this.vy * s;
      if (this.y <= g) {
        const hard = this.vy < -6;
        this.y = g;
        this.vy = 0;
        if (this.state === FS.THROWN) this.setState(FS.DOWN);
        if (this.state === FS.AERIAL) this.landAerial(hard);
        this.events.push({ type: 'landed', hard });
      }
    } else {
      this.y = g;
    }

    this.x += this.vx * s;
    this.z += this.vz * s;

    /*
     * Ground friction only applies on the ground. Applying it in mid-air killed
     * the horizontal impulse of every leap and throw within about ten frames: a
     * top-rope dive travelled twenty centimetres and landed back in its own
     * corner, and bodies thrown out of the ring never reached the floor.
     */
    const airborne = this.y > this.groundY + 0.02
      || this.state === FS.AERIAL || this.state === FS.THROWN;
    const friction = airborne
      ? TUNING.move.airDrag
      : (this.state === FS.ROPE_RUN || this.state === FS.WHIPPED ? 0.6 : TUNING.move.friction);
    const f = Math.exp(-friction * s);
    this.vx *= f;
    this.vz *= f;
    if (Math.abs(this.vx) < 0.01) this.vx = 0;
    if (Math.abs(this.vz) < 0.01) this.vz = 0;

    this.applyBounds();
  }

  /**
   * The ropes are a wall you bounce off, the apron is a ledge, and the floor is
   * a place you can be thrown to. Which one applies depends on how the body got
   * there — an airborne dive clears the ropes, a walking fighter does not.
   */
  private applyBounds(): void {
    const r = this.cfg.stats.radius;
    const flying = this.isAirborne || this.state === FS.AERIAL || this.state === FS.THROWN;

    if (this.outside) {
      const c = clampFloor(this.x, this.z, r);
      if (c.x !== this.x || c.z !== this.z) { this.vx *= -0.3; this.vz *= -0.3; }
      this.x = c.x; this.z = c.z;
      return;
    }

    // Airborne bodies clear the ropes: that is what makes dives and throws to
    // the floor possible at all.
    if (flying) return;

    if (this.state === FS.APRON) {
      const lim = RING.apronOuter - r * 0.5;
      this.x = Math.max(-lim, Math.min(lim, this.x));
      this.z = Math.max(-lim, Math.min(lim, this.z));
      return;
    }

    if (!insideRing(this.x, this.z)) {
      /*
       * The ropes are solid unless you meant it. Only a fighter deliberately
       * walking out ends up on the apron; being shoved by an ordinary strike
       * bounces off the ropes instead, because sliding out of the ring on a jab
       * and getting stranded there is miserable to play.
       */
      const walkingOut = this.state === FS.WALK || this.state === FS.RUN;
      if (walkingOut) {
        this.setState(FS.APRON);
        return;
      }
      const c = clampMat(this.x, this.z, r);
      // A little bounce back off the ropes, so the collision reads as ropes.
      if (c.x !== this.x) this.vx = -this.vx * 0.35;
      if (c.z !== this.z) this.vz = -this.vz * 0.35;
      this.x = c.x;
      this.z = c.z;
      return;
    }

    const c = clampMat(this.x, this.z, r);
    this.x = c.x;
    this.z = c.z;
  }

  /* ------------------------------------------------------------------ *
   * free movement
   * ------------------------------------------------------------------ */

  private updateFree(dt: number, intent: Intent, opponent: Fighter, heat01: number): void {
    if (this.exhausted) { this.setState(FS.DOWN); return; }

    this.buffer(intent);
    if (this.consumePending(opponent, heat01)) return;

    const mag = stickMagnitude(intent);
    if (mag > 0.12) {
      const running = mag > TUNING.move.runThreshold;
      const norm = Math.hypot(intent.moveX, intent.moveY) || 1;
      const nx = intent.moveX / norm;
      const nz = intent.moveY / norm;

      /*
       * Running into the ropes starts a rope run. This is the single most
       * important thing the ring does, and it costs the player no extra button.
       * It needs a run-up, so standing against the ropes and nudging the stick
       * does not trip it, and ropeAhead() refuses corners and glancing angles.
       */
      if (running && insideRing(this.x, this.z) && !inCorner(this.x, this.z)) {
        /*
         * Sprinting into a rope starts a rope run. There is deliberately no
         * run-up requirement: pressing into the ropes from against them is
         * exactly how a wrestler pushes off, and requiring clear space meant a
         * fighter who ended up on the ropes just ground against them forever.
         * A full-magnitude stick is already a deliberate sprint.
         */
        const rope = ropeAhead(this.x, this.z, nx, nz, 0.75);
        if (rope) { this.startRopeRun(nx, nz); return; }
      }

      const speed = this.cfg.stats.speed * this.speedMult
        * (running ? TUNING.move.run : TUNING.move.walk) * mag;
      const a = TUNING.move.accel * (dt / 1000);
      this.vx += (nx * speed - this.vx) * Math.min(1, a);
      this.vz += (nz * speed - this.vz) * Math.min(1, a);
      this.setState(running ? FS.RUN : FS.WALK);

      const prev = this.stridePhase;
      this.stridePhase += (dt / 1000) * (running ? 7.6 : 4.4);
      if (Math.floor(prev / Math.PI) !== Math.floor(this.stridePhase / Math.PI)) {
        this.events.push({ type: 'footstep', running });
      }
    } else {
      this.setState(FS.IDLE);
      this.stridePhase = 0;
    }
  }

  private buffer(intent: Intent): void {
    if (intent.attack) { this.pending = 'attack'; this.pendingAge = 0; }
    else if (intent.grab) { this.pending = 'grab'; this.pendingAge = 0; }
    else if (intent.special) { this.pending = 'special'; this.pendingAge = 0; }
  }

  /** Called every frame, including while locked, so a press is never dropped. */
  pump(intent: Intent): void {
    if (ACTIONABLE.has(this.state)) return;
    this.buffer(intent);
  }

  /**
   * Drops any buffered press. Used when entering a state where a carried-over
   * input would immediately undo the thing the player just did — climbing the
   * turnbuckle and instantly climbing back down, for instance.
   */
  private clearBuffer(): void {
    this.pending = null;
    this.pendingAge = 0;
  }

  private consumePending(opponent: Fighter, heat01: number): boolean {
    const p = this.pending;
    if (!p) return false;
    this.pending = null;
    if (p === 'attack') return this.doAttack(opponent);
    if (p === 'grab') return this.doGrab(opponent);
    return this.doSpecial(opponent, heat01);
  }

  /* ------------------------------------------------------------------ *
   * rope running and rebounds
   * ------------------------------------------------------------------ */

  private startRopeRun(nx: number, nz: number): void {
    this.runDirX = nx;
    this.runDirZ = nz;
    this.ropeLaps = 0;
    this.reboundGrace = 0;
    this.setState(FS.ROPE_RUN);
    this.events.push({ type: 'ropeRun' });
  }

  private ropeSpeed(): number {
    const lap = 1 + Math.min(this.ropeLaps, 3) * 0.16;
    return this.cfg.stats.speed * this.speedMult * TUNING.move.run * 1.35 * lap;
  }

  private updateRopeRun(dt: number, intent: Intent, opponent: Fighter, heat01: number): void {
    this.buffer(intent);

    // Rebound attacks are the payoff for using the ropes at all.
    const p = this.pending;
    if (p === 'attack') {
      this.pending = null;
      const m = this.cfg.moves;
      // Running at an opponent who is outside becomes a dive through the ropes.
      if (opponent.outside && this.nearRopeFacing(opponent)) {
        this.startMove(m.suicideDive);
        return;
      }
      this.startMove(this.ropeLaps > 0 ? m.reboundStrike : m.running);
      return;
    }
    if (p === 'grab') {
      this.pending = null;
      this.startMove(this.ropeLaps > 0 ? m2(this) : this.cfg.moves.grapple);
      return;
    }
    if (p === 'special') {
      this.pending = null;
      this.doSpecial(opponent, heat01);
      return;
    }

    const sp = this.ropeSpeed();
    this.vx = this.runDirX * sp;
    this.vz = this.runDirZ * sp;

    const prev = this.stridePhase;
    this.stridePhase += (dt / 1000) * 9.4;
    if (Math.floor(prev / Math.PI) !== Math.floor(this.stridePhase / Math.PI)) {
      this.events.push({ type: 'footstep', running: true });
    }

    // Hit the far ropes: bounce back with more speed each time.
    const r = this.cfg.stats.radius;
    const limX = RING.half - r;
    const limZ = RING.halfZ - r;
    let bounced = false;
    if (Math.abs(this.x) >= limX && Math.sign(this.x) === Math.sign(this.runDirX) && this.runDirX !== 0) {
      this.x = Math.sign(this.x) * limX;
      this.runDirX *= -1;
      bounced = true;
    }
    if (Math.abs(this.z) >= limZ && Math.sign(this.z) === Math.sign(this.runDirZ) && this.runDirZ !== 0) {
      this.z = Math.sign(this.z) * limZ;
      this.runDirZ *= -1;
      bounced = true;
    }
    if (bounced) {
      this.ropeLaps += 1;
      this.reboundBoost = 1;
      this.reboundGrace = TUNING.combat.reboundGraceMs;
      this.events.push({ type: 'rebound' });
    }

    /*
     * Steering hard against the run drops out of it — but not straight after a
     * bounce. Holding the stick through the rebound is the natural thing to do,
     * and without this grace the run direction flipping under the player's
     * thumb read as an instant cancel: the rebound existed for five frames and
     * could never be attacked out of.
     */
    this.reboundGrace = Math.max(0, this.reboundGrace - dt);
    const mag = stickMagnitude(intent);
    const along = intent.moveX * this.runDirX + intent.moveY * this.runDirZ;
    const steeringOff = this.reboundGrace <= 0 && mag > 0.4 && along < -0.35;
    if (steeringOff || this.ropeLaps > 3 || this.stateTime > 4600) {
      this.setState(FS.IDLE);
    }
  }

  /** True if the opponent is roughly beyond the rope this fighter is heading at. */
  private nearRopeFacing(opponent: Fighter): boolean {
    const toward = (opponent.x - this.x) * this.runDirX + (opponent.z - this.z) * this.runDirZ;
    return toward > 0;
  }

  /** Being whipped: carried to the ropes by someone else's throw, then rebounds. */
  private updateWhipped(dt: number): void {
    void dt;
    const r = this.cfg.stats.radius;
    const limX = RING.half - r;
    const limZ = RING.halfZ - r;
    if (Math.abs(this.x) >= limX || Math.abs(this.z) >= limZ) {
      if (Math.abs(this.x) >= limX) { this.x = Math.sign(this.x) * limX; this.vx *= -0.92; }
      if (Math.abs(this.z) >= limZ) { this.z = Math.sign(this.z) * limZ; this.vz *= -0.92; }
      this.events.push({ type: 'rebound' });
      this.setState(FS.ROPE_RUN);
      const m = Math.hypot(this.vx, this.vz) || 1;
      this.runDirX = this.vx / m;
      this.runDirZ = this.vz / m;
      this.ropeLaps = 1;
      return;
    }
    if (this.stateTime > 1400) this.setState(FS.IDLE);
  }

  /* ------------------------------------------------------------------ *
   * climbing, perching, the apron
   * ------------------------------------------------------------------ */

  private updateClimb(dt: number): void {
    void dt;
    const { corner } = nearestCorner(this.x, this.z);
    this.x = corner.x * 0.93;
    this.z = corner.z * 0.93;
    this.y = TUNING.ring.matY + (this.stateTime / 520) * TUNING.ring.postHeight;
    if (this.stateTime >= 520) {
      this.y = TUNING.ring.matY + TUNING.ring.postHeight;
      this.setState(FS.PERCH);
      this.clearBuffer();
      this.events.push({ type: 'perch' });
    }
  }

  private updatePerch(dt: number, intent: Intent, opponent: Fighter, heat01: number): void {
    void dt;
    const { corner } = nearestCorner(this.x, this.z);
    this.x = corner.x * 0.93;
    this.z = corner.z * 0.93;
    this.y = TUNING.ring.matY + TUNING.ring.postHeight;

    this.buffer(intent);
    const p = this.pending;
    if (p === 'attack') {
      this.pending = null;
      const m = this.cfg.moves;
      this.startMove(opponent.outside ? m.topRopeDiveOutside : m.topRopeDive);
      return;
    }
    if (p === 'grab' && this.stateTime > 220) {
      /*
       * Climb down rather than commit. Gated on a short settle time as well as
       * the cleared buffer: tapping GRAB twice to climb is a completely natural
       * thing to do, and it used to put you straight back on the mat.
       */
      this.pending = null;
      this.y = TUNING.ring.matY;
      this.setState(FS.IDLE);
      return;
    }
    if (p === 'special') {
      this.pending = null;
      this.doSpecial(opponent, heat01);
      return;
    }
    // Standing on the top rope for too long is not free: you get shaken off.
    if (this.stateTime > 5000) {
      this.y = TUNING.ring.matY;
      this.knockDown(1.6);
    }
  }

  private updateApron(dt: number, intent: Intent, opponent: Fighter, heat01: number): void {
    this.buffer(intent);
    const p = this.pending;
    if (p === 'grab') {
      this.pending = null;
      // Roll back into the ring.
      const c = clampMat(this.x * 0.7, this.z * 0.7, this.cfg.stats.radius);
      this.x = c.x; this.z = c.z;
      this.y = TUNING.ring.matY;
      this.setState(FS.GETUP);
      this.events.push({ type: 'enteredRing' });
      return;
    }
    if (p === 'attack') {
      this.pending = null;
      if (opponent.outside) { this.startMove(this.cfg.moves.suicideDive); return; }
      this.startMove(this.cfg.moves.running);
      return;
    }
    if (p === 'special') { this.pending = null; this.doSpecial(opponent, heat01); return; }

    const mag = stickMagnitude(intent);
    if (mag > 0.12) {
      const norm = Math.hypot(intent.moveX, intent.moveY) || 1;
      const speed = this.cfg.stats.speed * this.speedMult * TUNING.move.walk * mag;
      const a = TUNING.move.accel * (dt / 1000);
      this.vx += ((intent.moveX / norm) * speed - this.vx) * Math.min(1, a);
      this.vz += ((intent.moveY / norm) * speed - this.vz) * Math.min(1, a);
    }
    // Stepping inward drops back into the ring.
    if (insideRing(this.x, this.z)) {
      this.y = TUNING.ring.matY;
      this.setState(FS.IDLE);
      this.events.push({ type: 'enteredRing' });
    }
  }

  /* ------------------------------------------------------------------ *
   * contextual actions
   * ------------------------------------------------------------------ */

  /**
   * ATTACK. Standing: a three-hit string whose third is automatically heavy.
   * Running the ropes: a running or rebound attack. On the turnbuckle: a dive.
   * Beside a downed opponent: a ground attack. Carrying a prop: swing it.
   * No holds, no timings, no extra buttons (Bible s9.2).
   */
  private doAttack(opponent: Fighter): boolean {
    const m = this.cfg.moves;
    const dist = this.distanceTo(opponent);

    if (this.carrying) {
      this.startMove(this.carrying.swing, false, opponent);
      this.spendProp();
      return true;
    }
    if (this.state === FS.PERCH) {
      this.startMove(opponent.outside ? m.topRopeDiveOutside : m.topRopeDive, false, opponent);
      return true;
    }
    if (opponent.state === FS.CORNERED && dist < m.cornerAttack.reach + opponent.cfg.stats.radius) {
      this.startMove(m.cornerAttack, false, opponent);
      return true;
    }
    if (opponent.isDown && dist < m.ground.reach + opponent.cfg.stats.radius) {
      this.startMove(m.ground, false, opponent);
      return true;
    }

    // Behind someone who is upright and unaware: a back attack, not a jab.
    if (!opponent.isDown && this.behind(opponent)
      && dist < m.backAttack.reach + opponent.cfg.stats.radius) {
      this.comboIndex = 0;
      this.startMove(m.backAttack, false, opponent);
      return true;
    }

    const onStunned = TUNING.combat.heavyOnStunned
      && (opponent.state === FS.STUN || opponent.state === FS.GRAPPLED);
    let move: MoveDef;
    if (onStunned && this.comboIndex >= 1) move = m.heavy;
    else if (this.comboIndex >= TUNING.combat.autoHeavyOnCombo - 1) move = m.heavy;
    else if (this.comboIndex === 1) move = m.light2;
    else move = m.light1;

    this.comboIndex = move.kind === 'heavy' ? 0 : this.comboIndex + 1;
    this.comboTimer = TUNING.combat.comboWindowMs;
    this.startMove(move, false, opponent);
    return true;
  }

  /**
   * GRAB. Standing: tie up. Downed and hurt: cover for the pin. Downed and
   * healthy: pick them up. In a corner: climb it. On the apron: roll in.
   */
  private doGrab(opponent: Fighter): boolean {
    const m = this.cfg.moves;
    const dist = this.distanceTo(opponent);

    if (this.carrying) { this.dropProp(); return true; }

    // Standing over a downed opponent: cover them, or pick them back up.
    if (opponent.isDown && dist < TUNING.pin.range) {
      const pinnable = opponent.healthFrac <= TUNING.pin.maxHealthFrac || opponent.exhausted;
      if (pinnable) { this.events.push({ type: 'wantsPin' }); return true; }
      this.startMove(m.pickUp, true);
      opponent.setState(FS.GETUP);
      return true;
    }

    /*
     * In a corner with a window to work in: climb the turnbuckle. The window is
     * the point — you buy it with a knockdown or a stun, which is what makes a
     * dive a reward for setting one up rather than a free option.
     *
     * This has to be checked BEFORE the grapple range test and before bailing
     * out on a distant downed opponent, or a knockdown (the best moment there
     * is to climb) would swallow the input and no dive could ever happen.
     */
    const { dist: cornerDist } = nearestCorner(this.x, this.z);
    const window = dist > 2.2 || opponent.isDown || opponent.state === FS.STUN
      || opponent.state === FS.CORNERED || opponent.state === FS.GRAPPLED;
    if (insideRing(this.x, this.z) && cornerDist <= RING.cornerR && window) {
      this.setState(FS.CLIMB);
      this.clearBuffer();
      this.events.push({ type: 'climb' });
      return true;
    }

    if (opponent.isDown) return false;

    // Front tie-up or rear waistlock, decided by where you are standing
    // relative to THEIR facing. This is the payoff for being able to turn.
    const rear = this.behind(opponent);
    const grab = rear ? m.rearGrapple : m.grapple;
    if (dist > grab.reach + opponent.cfg.stats.radius) return false;
    this.rearHold = rear;
    this.startMove(grab, false, opponent);
    this.setState(FS.GRAPPLE_START);
    return true;
  }

  /** True when this fighter is behind `other`, measured from other's facing. */
  behind(other: Fighter): boolean {
    return isBehind(this.x, this.z, other.x, other.z, other.facing);
  }

  /**
   * IT / SPECIAL. Below the signature threshold it is a taunt, and which taunt
   * depends on the situation: standing over someone, playing to the crowd, or a
   * quick one because you do not have time for more.
   */
  private doSpecial(opponent: Fighter, heat01: number): boolean {
    if (this.canFinish) {
      this.it -= TUNING.meters.finisherCost;
      this.startMove(this.cfg.moves.finisher);
      return true;
    }
    if (this.canSignature) {
      this.it -= TUNING.meters.signatureCost;
      this.startMove(this.cfg.moves.signature);
      return true;
    }

    const dist = this.distanceTo(opponent);
    const taunt = this.pickTaunt(opponent, dist);
    this.activeTaunt = taunt;
    this.setState(FS.TAUNT);
    this.addIt(taunt.it, heat01);
    this.events.push({ type: 'taunt', taunt });
    return true;
  }

  private pickTaunt(opponent: Fighter, dist: number): TauntDef {
    const t = this.cfg.taunts;
    const byKind = (k: TauntDef['kind']): TauntDef | undefined => t.find((x) => x.kind === k);
    if (opponent.isDown && dist < 2.2) return byKind('opponent') ?? t[0]!;
    // Far from trouble and standing still: play to the room, and take the risk.
    if (dist > 4.2) return byKind('crowd') ?? byKind('big') ?? t[0]!;
    if (dist > 2.8) return byKind('big') ?? t[0]!;
    return byKind('short') ?? t[0]!;
  }

  private updateTaunt(): void {
    const t = this.activeTaunt;
    const dur = t?.durationMs ?? TUNING.combat.tauntMs;
    if (this.stateTime >= dur) {
      this.activeTaunt = null;
      this.setState(FS.IDLE);
    }
  }

  startMove(move: MoveDef, guaranteed = false, target?: Fighter): void {
    if (target) this.assistFacing(target, move);
    this.action = { move, elapsed: 0, hasHit: false, guaranteed, launched: false };
    this.activeTaunt = null;
    this.setState(move.leap ? FS.AERIAL : FS.ATTACK);
    this.events.push({ type: 'move', move });
  }

  private updateAttack(dt: number): void {
    const a = this.action;
    if (!a) { this.setState(FS.IDLE); return; }
    a.elapsed += dt;

    this.updatePair(a.move, this.actionProgress);

    if (a.move.lunge && a.elapsed < a.move.startupMs) {
      const l = a.move.lunge;
      this.vx += Math.cos(this.facing) * l * (dt / 1000) * 12;
      this.vz += Math.sin(this.facing) * l * (dt / 1000) * 12;
    }

    const total = a.move.startupMs + a.move.activeMs + a.move.recoveryMs;
    if (a.elapsed >= total) {
      if (!a.hasHit) this.events.push({ type: 'whiff', move: a.move });
      this.releasePair(a.move);
      this.action = null;
      this.setState(FS.IDLE);
    }
  }

  /**
   * Drives a paired throw. The victim is carried at a fixed offset in the
   * attacker's own frame and plays the receiving half of the choreography, so a
   * suplex looks like a suplex instead of two people sliding apart.
   */
  private updatePair(move: MoveDef, progress: number): void {
    const v = this.pairVictim;
    const p = move.paired;
    if (!v || !p) return;

    if (progress >= p.releaseAt) { this.releasePair(move); return; }

    const [fwd, up, side] = p.hold;
    const c = Math.cos(this.facing);
    const sn = Math.sin(this.facing);
    v.x = this.x + c * fwd - sn * side;
    v.z = this.z + sn * fwd + c * side;
    v.y = this.y + up;
    v.vx = 0; v.vz = 0; v.vy = 0;
    v.facing = this.facing;
    v.pairProgress = progress / Math.max(0.001, p.releaseAt);
  }

  /** Lets the victim go at the choreographed moment, with the throw's impulse. */
  private releasePair(move: MoveDef): void {
    const v = this.pairVictim;
    if (!v) return;
    this.pairVictim = null;
    v.pairClip = null;
    v.pairProgress = 0;
    if (move.knockdown) {
      v.vx = Math.cos(this.facing) * move.knockback;
      v.vz = Math.sin(this.facing) * move.knockback;
      v.vy = Math.max(v.vy, 0.6);
      if (v.state !== FS.THROWN && !v.exhausted) v.knockDown(0.4);
    }
  }

  /** Begins carrying `victim` through a paired move. */
  beginPair(victim: Fighter, move: MoveDef): void {
    if (!move.paired) return;
    this.pairVictim = victim;
    victim.pairClip = move.paired.victimClip;
    victim.pairProgress = 0;
    victim.action = null;
    victim.partner = null;
  }

  /** A committed leap. Once you are in the air you cannot change your mind. */
  private updateAerial(dt: number): void {
    const a = this.action;
    if (!a) { this.setState(FS.IDLE); return; }
    a.elapsed += dt;

    if (!a.launched && a.elapsed >= a.move.startupMs) {
      a.launched = true;
      const leap = a.move.leap!;
      const air = this.cfg.stats.air;
      this.vy = leap.up * air;
      this.vx = Math.cos(this.facing) * leap.forward * air;
      this.vz = Math.sin(this.facing) * leap.forward * air;
      // Leaving the top rope means leaving the ring's collision box too.
      this.y = Math.max(this.y, this.groundY + 0.05);
    }
  }

  private landAerial(hard: boolean): void {
    const a = this.action;
    this.action = null;
    if (a && !a.hasHit) {
      // Missing a dive is supposed to hurt. This is what makes it a risk.
      this.events.push({ type: 'whiff', move: a.move });
      const penalty = a.move.whiffPenaltyMs ?? 600;
      this.health = Math.max(1, this.health - a.move.damage * 0.18);
      this.knockDown(0.8);
      this.stateTime = -penalty * 0.5;
      return;
    }
    if (hard) { this.knockDown(0.5); return; }
    this.setState(FS.IDLE);
  }

  private updateStun(): void {
    if (this.stateTime >= 0) this.setState(FS.IDLE);
  }

  /* ------------------------------------------------------------------ *
   * grapple
   * ------------------------------------------------------------------ */

  private updateGrappleStart(dt: number, opponent: Fighter): void {
    const a = this.action;
    if (!a) { this.setState(FS.IDLE); return; }
    a.elapsed += dt;
    if (a.elapsed < a.move.startupMs) return;

    const dist = this.distanceTo(opponent);
    const canGrab = dist <= a.move.reach + opponent.cfg.stats.radius
      && !opponent.isDown
      && opponent.invuln <= 0
      && opponent.state !== FS.REVERSAL
      && opponent.state !== FS.AERIAL;

    if (canGrab) {
      this.partner = opponent;
      opponent.partner = this;
      this.grappleTimer = TUNING.combat.grappleHoldMs;
      this.grappleTaps = 0;
      opponent.grappleTaps = 0;
      this.action = null;
      this.setState(FS.GRAPPLING);
      opponent.action = null;
      opponent.setState(FS.GRAPPLED);
      this.events.push({ type: 'grappleLock' });
    } else if (a.elapsed >= a.move.startupMs + a.move.recoveryMs) {
      this.action = null;
      this.setState(FS.IDLE);
      this.events.push({ type: 'whiff', move: a.move });
    }
  }

  /**
   * Holding someone. The stick picks the throw, and where you are standing
   * decides what that throw means: toward a rope whips them into it, toward a
   * corner buries them in it, and toward the outside puts them on the floor.
   */
  private updateGrappling(dt: number, intent: Intent, opponent: Fighter, heat01: number): void {
    this.grappleTimer -= dt;
    const hx = this.x + Math.cos(this.facing) * 0.72;
    const hz = this.z + Math.sin(this.facing) * 0.72;
    opponent.x = hx; opponent.z = hz;
    opponent.y = this.y;
    opponent.vx = 0; opponent.vz = 0;
    // A waistlock holds them facing AWAY from you; a tie-up faces them at you.
    opponent.facing = this.rearHold ? this.facing : this.facing + Math.PI;

    if (this.grappleTimer <= 0 || opponent.state !== FS.GRAPPLED) {
      this.releaseGrapple();
      return;
    }

    if (intent.special && (this.canSignature || this.canFinish)) {
      const fin = this.canFinish;
      this.it -= fin ? TUNING.meters.finisherCost : TUNING.meters.signatureCost;
      const move = fin ? this.cfg.moves.finisher : this.cfg.moves.signature;
      this.detachGrapple(opponent);
      this.startMove(move, true);
      opponent.takeHit(move, this, 1);
      this.addIt(move.itGain, heat01);
      return;
    }

    if (!intent.attack && !intent.grab) return;

    const m = this.cfg.moves;
    const stick = Math.hypot(intent.moveX, intent.moveY);
    const dirX = stick > 0.3 ? intent.moveX / stick : Math.cos(this.facing);
    const dirZ = stick > 0.3 ? intent.moveY / stick : Math.sin(this.facing);
    const backwards = stick > 0.45
      && (dirX * Math.cos(this.facing) + dirZ * Math.sin(this.facing)) < -0.45;

    // Where would this throw send them?
    const targetX = this.x + dirX * 3.4;
    const targetZ = this.z + dirZ * 3.4;
    const towardOutside = Math.abs(targetX) > RING.half + 0.4 || Math.abs(targetZ) > RING.half + 0.4;
    const towardCorner = nearestCorner(targetX, targetZ).dist < RING.cornerR * 1.25
      && !towardOutside;
    const towardRopes = !towardOutside && !towardCorner
      && (Math.abs(targetX) > RING.half - RING.ropeBand || Math.abs(targetZ) > RING.half - RING.ropeBand);

    /*
     * A destination only counts when the player actually pushed the stick.
     * Without that check the geometry alone could claim the throw — a neutral
     * release near a corner was being read as "toward the corner", which meant
     * the rear throw could never come out of a waistlock.
     */
    const directed = stick > 0.45;
    let move: MoveDef;
    if (directed && towardOutside) move = m.throwOutside;
    else if (directed && towardCorner) move = m.throwCorner;
    else if (directed && towardRopes && intent.grab) move = m.irishWhip;
    else if (this.rearHold) move = m.rearThrow;
    else if (backwards) move = m.throwBack;
    else move = m.throwForward;

    this.detachGrapple(opponent);
    this.startMove(move, true);
    if (move.paired) this.beginPair(opponent, move);
    opponent.takeHit(move, this, 1);
    this.addIt(move.itGain, heat01);

    // The throw's destination is what makes the ring matter.
    if (move === m.irishWhip) {
      opponent.setState(FS.WHIPPED);
      opponent.vx = dirX * 13;
      opponent.vz = dirZ * 13;
    } else if (move === m.throwCorner) {
      const c = nearestCorner(targetX, targetZ).corner;
      opponent.x = c.x * 0.88;
      opponent.z = c.z * 0.88;
      opponent.setState(FS.CORNERED);
    } else if (move === m.throwOutside) {
      opponent.vx = dirX * 9;
      opponent.vz = dirZ * 9;
      opponent.vy = 4.4;
      opponent.events.push({ type: 'leftRing' });
    }
  }

  private detachGrapple(opponent: Fighter): void {
    this.grappleTimer = 0;
    this.partner = null;
    opponent.partner = null;
    this.rearHold = false;
  }

  private updateGrappled(intent: Intent): void {
    if (intent.anyPress) this.grappleTaps += 1;
    if (this.grappleTaps >= TUNING.combat.grappleEscapeTaps) {
      const holder = this.partner;
      if (holder) holder.releaseGrapple();
      else this.setState(FS.IDLE);
      this.events.push({ type: 'grappleBreak' });
    }
  }

  private updateDragging(dt: number, intent: Intent, opponent: Fighter, heat01: number): void {
    // Dragging reuses the grapple hold, but the victim is behind rather than in
    // front, so it can be walked anywhere in the ring.
    this.updateGrappling(dt, intent, opponent, heat01);
  }

  releaseGrapple(): void {
    const other = this.partner;
    this.partner = null;
    this.grappleTimer = 0;
    this.rearHold = false;
    if (this.state === FS.GRAPPLING || this.state === FS.DRAGGING) this.setState(FS.IDLE);
    if (other) {
      other.partner = null;
      if (other.state === FS.GRAPPLED || other.state === FS.DRAGGED) {
        other.setState(FS.IDLE);
        other.vx += Math.cos(this.facing) * 2.2;
        other.vz += Math.sin(this.facing) * 2.2;
      }
    }
  }

  /* ------------------------------------------------------------------ *
   * down and recovery
   * ------------------------------------------------------------------ */

  private updateThrown(): void {
    if (this.y <= this.groundY) this.setState(FS.DOWN);
  }

  private updateDown(intent: Intent): void {
    if (this.exhausted) return;
    if (intent.anyPress) this.stateTime += TUNING.combat.downMashReduction;
    if (this.stateTime >= TUNING.combat.downMs) {
      this.setState(FS.GETUP);
      this.events.push({ type: 'getUp' });
    }
  }

  /* ------------------------------------------------------------------ */

  distanceTo(other: Fighter): number {
    return Math.hypot(other.x - this.x, other.z - this.z);
  }

  drainEvents(): FighterEvent[] {
    const out = this.events.slice();
    this.events.length = 0;
    return out;
  }
}

/** Rebound grapple, pulled out so the rope-run switch stays readable. */
function m2(f: Fighter): MoveDef {
  return f.cfg.moves.reboundGrapple;
}
