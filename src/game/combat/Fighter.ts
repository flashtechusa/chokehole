import type { FighterBuff, MoveDef, WrestlerConfig } from '@/game/types';
import type { Intent } from '@/game/input/Intent';
import { TUNING } from '@/game/config/tuning';
import { ACTIONABLE, FS, LOCKED } from './states';

export interface ActiveAction {
  move: MoveDef;
  elapsed: number;
  hasHit: boolean;
  /** Grapple follow-ups skip the whiff check. */
  guaranteed: boolean;
}

export type FighterEvent =
  | { type: 'move'; move: MoveDef }
  | { type: 'taunt' }
  | { type: 'ropeBounce' }
  | { type: 'grappleLock' }
  | { type: 'grappleBreak' }
  | { type: 'buff'; buff: FighterBuff }
  | { type: 'getUp' }
  | { type: 'wantsPin' }
  | { type: 'exhausted' };

/**
 * Pure-logic wrestler. Owns position, the state machine, meters and timers.
 * Knows nothing about Phaser — MatchScene renders it and CombatSystem resolves
 * contact between two of them. The AI drives an identical Intent, so it can
 * never do anything the player cannot.
 */
export class Fighter {
  readonly cfg: WrestlerConfig;
  readonly side: 1 | -1;

  // --- transform (ring space) ---
  x = 0;
  /** 0 = far rope, 1 = near rope. */
  depth = 0.5;
  /** Height above the mat. */
  z = 0;
  vx = 0;
  vz = 0;
  vdepth = 0;
  facing: 1 | -1 = 1;

  // --- state ---
  state: FS = FS.IDLE;
  stateTime = 0;
  action: ActiveAction | null = null;

  // --- meters ---
  health: number;
  maxHealth: number;
  squelsh = 0;
  guard = TUNING.combat.guardBreak;
  buffs: (FighterBuff & { remaining: number })[] = [];

  // --- combo / timers ---
  comboCount = 0;
  comboTimer = 0;
  blockAge = 0;
  invuln = 0;
  hitFlash = 0;
  /** Set while health is at zero: cannot stand, only survives the pin count. */
  exhausted = false;
  koTimer = 0;

  // --- input buffering ---
  /**
   * A pressed action is remembered while the fighter is locked in recovery and
   * fires the moment it can. Without this, anything you press during an attack's
   * recovery is silently dropped, which reads as the game ignoring you --
   * measured at 19 of 26 taps doing nothing.
   */
  private pending: 'light' | 'grapple' | 'special' | null = null;
  private pendingAge = 0;
  /** How long a press stays live waiting for an opening. */
  private static readonly BUFFER_MS = 180;

  // --- hold-to-heavy ---
  private strikeHoldMs = 0;
  private heavyFiredThisHold = false;
  private lastMoveTapDir = 0;
  private lastMoveTapAt = -9999;
  private lastSpecialAt = -9999;
  private lightToggle = 0;

  // --- grapple ---
  grapplePartner: Fighter | null = null;
  grappleTimer = 0;
  struggle = 0;
  /** Grapple chain strikes used this hold. */
  grappleHits = 0;

  // --- mash ---
  mash = 0;

  /** Consumed by MatchScene each frame. */
  events: FighterEvent[] = [];
  /** Raised when this fighter asks to cover a downed opponent. */
  pendingPin = false;

  /** Set by MatchScene from the arena config. */
  ringHalfWidth = 372;

  private clock = 0;

  constructor(cfg: WrestlerConfig, side: 1 | -1) {
    this.cfg = cfg;
    this.side = side;
    this.maxHealth = cfg.stats.health;
    this.health = cfg.stats.health;
    this.facing = side === 1 ? 1 : -1;
  }

  /* ---------------------------------------------------------------- *
   * derived
   * ---------------------------------------------------------------- */

  get powerMult(): number {
    return this.buffs.reduce((m, b) => m * (b.powerMult ?? 1), this.cfg.stats.power);
  }
  get speedMult(): number {
    return this.buffs.reduce((m, b) => m * (b.speedMult ?? 1), 1);
  }
  get reachMult(): number {
    return this.buffs.reduce((m, b) => m * (b.reachMult ?? 1), 1);
  }
  get damageTakenMult(): number {
    return this.buffs.reduce((m, b) => m * (b.damageTakenMult ?? 1), 1);
  }
  get squelshMult(): number {
    return this.buffs.reduce((m, b) => m * (b.squelshGainMult ?? 1), this.cfg.stats.squelshGain);
  }
  get healthFrac(): number {
    return Math.max(0, this.health / this.maxHealth);
  }
  get canSignature(): boolean {
    return this.squelsh >= TUNING.meters.signatureCost;
  }
  get canFinish(): boolean {
    return this.squelsh >= TUNING.meters.finisherCost;
  }
  get isDown(): boolean {
    return this.state === FS.DOWN || this.state === FS.PINNED;
  }
  get isBusy(): boolean {
    return LOCKED.has(this.state);
  }

  /** Animation clip name for the renderer. */
  get anim(): string {
    switch (this.state) {
      case FS.ATTACK: {
        const m = this.action!.move;
        if (m.anim) return m.anim;
        if (m.kind === 'light') return this.lightToggle === 0 ? 'light1' : 'light2';
        if (m.kind === 'heavy') return 'heavy';
        if (m.kind === 'grapple') return 'grappleThrow';
        if (m.kind === 'signature') return 'signature';
        if (m.kind === 'finisher') return 'finisher';
        return 'light1';
      }
      case FS.WALK: return 'walk';
      case FS.RUN: return 'run';
      case FS.BLOCK: return 'block';
      case FS.REVERSAL: return 'reversal';
      case FS.GRAPPLE_START: return 'grappleStart';
      case FS.GRAPPLING: return 'grappleHold';
      case FS.GRAPPLED: return 'grappled';
      case FS.STUN: return 'hurt';
      case FS.DOWN: return 'down';
      case FS.GET_UP: return 'getUp';
      case FS.TAUNT: return 'taunt';
      case FS.PIN: return 'pin';
      case FS.PINNED: return 'pinned';
      case FS.WIN: return 'victory';
      case FS.LOSE: return 'loss';
      default: return 'idle';
    }
  }

  /** 0..1 progress through the current clip (attacks use real frame data). */
  get animProgress(): number {
    if (this.state === FS.ATTACK && this.action) {
      const m = this.action.move;
      return Math.min(1, this.action.elapsed / (m.startup + m.active + m.recovery));
    }
    return this.stateTime;
  }

  /** Charge ratio 0..1 for the heavy-attack tell. */
  get chargeRatio(): number {
    if (this.heavyFiredThisHold) return 0;
    return Math.min(1, this.strikeHoldMs / TUNING.combat.heavyChargeMs);
  }

  /* ---------------------------------------------------------------- *
   * state transitions
   * ---------------------------------------------------------------- */

  setState(s: FS): void {
    if (this.state === s) return;
    this.state = s;
    this.stateTime = 0;
    if (s !== FS.ATTACK) this.action = null;
  }

  addSquelsh(amount: number, heat01 = 0): void {
    const heatMult = 1 + (TUNING.meters.heatSquelshMult - 1) * heat01;
    this.squelsh = Math.min(
      TUNING.meters.squelshMax,
      this.squelsh + amount * this.squelshMult * heatMult,
    );
  }

  applyBuff(buff: FighterBuff): void {
    this.buffs = this.buffs.filter((b) => b.id !== buff.id);
    this.buffs.push({ ...buff, remaining: buff.durationMs });
    this.events.push({ type: 'buff', buff });
  }

  /* ---------------------------------------------------------------- *
   * damage
   * ---------------------------------------------------------------- */

  /** Applies a landed move. Returns the damage actually taken. */
  takeHit(move: MoveDef, attacker: Fighter, blocked: boolean): number {
    const raw = move.damage * attacker.powerMult * this.damageTakenMult;
    const dmg = blocked ? raw * TUNING.combat.blockChip : raw;
    this.health = Math.max(0, this.health - dmg);
    this.hitFlash = 1;

    this.addSquelsh(dmg * TUNING.meters.squelshOnDamageTaken);

    const dir = attacker.x <= this.x ? 1 : -1;
    if (blocked) {
      this.guard -= raw * 0.6;
      this.vx += dir * move.knockback * 0.3;
      if (this.guard <= 0) {
        this.guard = TUNING.combat.guardBreak;
        this.stun(620);
      }
      return dmg;
    }

    this.vx += dir * move.knockback;
    this.comboCount = 0;

    if (this.health <= 0) {
      this.exhausted = true;
      this.knockDown(move.launch ?? 120);
      this.events.push({ type: 'exhausted' });
      return dmg;
    }
    if (move.knockdown) this.knockDown(move.launch ?? 160);
    else this.stun(move.hitstun);
    return dmg;
  }

  stun(ms: number): void {
    this.breakGrapple();
    this.setState(FS.STUN);
    this.stateTime = -ms / 1000;
  }

  knockDown(launch: number): void {
    this.breakGrapple();
    this.setState(FS.DOWN);
    this.z = Math.max(this.z, 1);
    this.vz = launch;
    this.mash = 0;
    this.stateTime = 0;
  }

  breakGrapple(): void {
    if (this.grapplePartner) {
      const p = this.grapplePartner;
      this.grapplePartner = null;
      if (p.grapplePartner === this) {
        p.grapplePartner = null;
        if (p.state === FS.GRAPPLING || p.state === FS.GRAPPLED) p.setState(FS.IDLE);
      }
    }
    this.grappleHits = 0;
    this.struggle = 0;
  }

  /* ---------------------------------------------------------------- *
   * update
   * ---------------------------------------------------------------- */

  update(dtMs: number, intent: Intent, opponent: Fighter, heat01: number): void {
    const dt = dtMs / 1000;
    this.clock += dtMs;

    // timers
    this.invuln = Math.max(0, this.invuln - dtMs);
    this.hitFlash = Math.max(0, this.hitFlash - dt * 4);
    this.comboTimer = Math.max(0, this.comboTimer - dtMs);
    if (this.comboTimer === 0) this.comboCount = 0;
    this.guard = Math.min(
      TUNING.combat.guardBreak,
      this.guard + TUNING.combat.guardRegenPerSec * dt,
    );
    for (const b of this.buffs) b.remaining -= dtMs;
    this.buffs = this.buffs.filter((b) => b.remaining > 0);
    this.stateTime += dt;

    if (this.state === FS.WIN || this.state === FS.LOSE) {
      this.integrate(dt);
      return;
    }

    if (this.state === FS.PIN || this.state === FS.PINNED) {
      // MatchScene drives the count; fighters just hold still.
      this.integrate(dt);
      return;
    }

    // face the opponent unless mid-action
    if (!this.isBusy) {
      this.facing = opponent.x >= this.x ? 1 : -1;
    }

    this.updateCharge(dtMs, intent, opponent, heat01);

    switch (this.state) {
      case FS.IDLE:
      case FS.WALK:
      case FS.RUN:
      case FS.BLOCK:
        this.updateFree(dt, dtMs, intent, opponent, heat01);
        break;
      case FS.ATTACK:
        this.updateAttack(dtMs);
        break;
      case FS.GRAPPLE_START:
        this.updateGrappleStart(dtMs, opponent);
        break;
      case FS.GRAPPLING:
        this.updateGrappling(dtMs, intent, opponent, heat01);
        break;
      case FS.GRAPPLED:
        this.updateGrappled(dtMs, intent);
        break;
      case FS.REVERSAL:
        if (this.stateTime > 0.42) this.setState(FS.IDLE);
        break;
      case FS.STUN:
        if (this.stateTime >= 0) this.setState(FS.IDLE);
        break;
      case FS.TAUNT:
        if (this.stateTime * 1000 > TUNING.combat.tauntMs) this.setState(FS.IDLE);
        break;
      case FS.DOWN:
        this.updateDown(dtMs, intent);
        break;
      case FS.GET_UP:
        if (this.stateTime * 1000 > TUNING.combat.getUpMs) {
          this.invuln = TUNING.combat.getUpInvulnMs;
          this.setState(FS.IDLE);
        }
        break;
    }

    this.integrate(dt);
  }

  /* ------------------------- sub-updates -------------------------- */

  /**
   * Buffers presses and drives the tap/hold split.
   *
   * A tap fires a light IMMEDIATELY on press. Holding past the threshold chains
   * into the heavy. Light used to fire on release, which added the whole
   * press-to-release duration as input latency on every single jab.
   */
  private updateCharge(dtMs: number, intent: Intent, opponent: Fighter, heat01: number): void {
    // remember presses even while locked out
    if (intent.strike && !intent.block) this.buffer('light');
    if (intent.grapple) this.buffer('grapple');
    if (intent.special) this.buffer('special');

    if (this.pending) {
      this.pendingAge += dtMs;
      if (this.pendingAge > Fighter.BUFFER_MS) this.pending = null;
    }

    if (intent.strikeHeld && !intent.block) this.strikeHoldMs += dtMs;
    else { this.strikeHoldMs = 0; this.heavyFiredThisHold = false; }

    if (!ACTIONABLE.has(this.state)) return;

    // held past the threshold -> heavy, once per hold
    if (this.strikeHoldMs >= TUNING.combat.heavyChargeMs && !this.heavyFiredThisHold) {
      this.heavyFiredThisHold = true;
      this.pending = null;
      this.startMove(this.cfg.moves.heavy);
      return;
    }
    void opponent;
    void heat01;
  }

  private buffer(action: 'light' | 'grapple' | 'special'): void {
    this.pending = action;
    this.pendingAge = 0;
  }

  /** Fires a buffered press as soon as the fighter is free. */
  private consumePending(opponent: Fighter, heat01: number): boolean {
    const a = this.pending;
    if (!a) return false;
    this.pending = null;
    if (a === 'special') { this.doSpecial(heat01); return true; }
    if (a === 'grapple') { this.doGrapple(opponent); return true; }
    const alt = this.cfg.lightAlt;
    const useAlt = alt !== undefined && this.lightToggle === 0 && this.comboCount > 0;
    this.lightToggle = useAlt ? 1 : 0;
    this.startMove(useAlt ? alt! : this.cfg.moves.light);
    return true;
  }

  private doSpecial(heat01: number): void {
    const doubleTap = this.clock - this.lastSpecialAt < 280;
    this.lastSpecialAt = this.clock;
    if (this.canFinish && !doubleTap) {
      this.squelsh -= TUNING.meters.finisherCost;
      this.startMove(this.cfg.moves.finisher);
      return;
    }
    if (this.canSignature && !doubleTap) {
      this.squelsh -= TUNING.meters.signatureCost;
      this.startMove(this.cfg.moves.signature);
      return;
    }
    this.startTaunt(heat01);
  }

  private doGrapple(opponent: Fighter): void {
    const dx = Math.abs(opponent.x - this.x);
    const dd = Math.abs(opponent.depth - this.depth) * TUNING.ring.depthPixels;
    if (opponent.isDown && dx < TUNING.combat.pinRange && dd < 46) {
      this.pendingPin = true;
      this.events.push({ type: 'wantsPin' });
      return;
    }
    this.setState(FS.GRAPPLE_START);
  }

  private updateFree(
    dt: number, dtMs: number, intent: Intent, opponent: Fighter, heat01: number,
  ): void {
    // BLOCK / REVERSAL stance
    if (intent.block) {
      if (this.state !== FS.BLOCK) {
        this.setState(FS.BLOCK);
        this.blockAge = 0;
      }
      this.blockAge += dtMs;
      this.vx *= 0.82;
      return;
    }
    if (this.state === FS.BLOCK) this.setState(FS.IDLE);

    // buffered presses fire here, the first frame the fighter is free
    if (this.consumePending(opponent, heat01)) return;

    // MOVEMENT
    const stats = this.cfg.stats;
    const runningAlready = this.state === FS.RUN;
    let mult = TUNING.fighter.walkMult;

    if (Math.abs(intent.moveX) > 0.6) {
      const dir = Math.sign(intent.moveX);
      if (dir !== this.lastMoveTapDir || this.clock - this.lastMoveTapAt > TUNING.fighter.dashWindow) {
        if (this.lastMoveTapDir === dir && this.clock - this.lastMoveTapAt < TUNING.fighter.dashWindow) {
          mult = TUNING.fighter.runMult;
        }
        this.lastMoveTapDir = dir;
        this.lastMoveTapAt = this.clock;
      }
    } else if (Math.abs(intent.moveX) < 0.2) {
      this.lastMoveTapDir = 0;
    }
    if (runningAlready && Math.abs(intent.moveX) > 0.75) mult = TUNING.fighter.runMult;
    if (Math.abs(intent.moveX) > 0.93) mult = TUNING.fighter.runMult;

    const targetVx = intent.moveX * stats.speed * mult * this.speedMult;
    const targetVd = intent.moveY * stats.speed * TUNING.fighter.depthMult * this.speedMult;

    this.vx += (targetVx - this.vx) * Math.min(1, TUNING.fighter.accel * dt / 260);
    this.vdepth += (targetVd - this.vdepth) * Math.min(1, TUNING.fighter.accel * dt / 220);

    const moving = Math.abs(intent.moveX) > 0.12 || Math.abs(intent.moveY) > 0.12;
    if (moving) this.setState(mult > 1.4 ? FS.RUN : FS.WALK);
    else if (Math.abs(this.vx) < 12) this.setState(FS.IDLE);
  }

  private updateAttack(dtMs: number): void {
    const a = this.action;
    if (!a) { this.setState(FS.IDLE); return; }
    a.elapsed += dtMs;
    const total = a.move.startup + a.move.active + a.move.recovery;
    this.vx *= 0.9;
    if (a.elapsed >= total) {
      this.action = null;
      this.setState(FS.IDLE);
    }
  }

  private updateGrappleStart(_dtMs: number, opponent: Fighter): void {
    if (this.stateTime * 1000 < TUNING.combat.grappleStartup) {
      this.vx *= 0.85;
      return;
    }
    const dx = Math.abs(opponent.x - this.x);
    const dd = Math.abs(opponent.depth - this.depth) * TUNING.ring.depthPixels;
    const canLock =
      !opponent.isDown &&
      opponent.invuln <= 0 &&
      opponent.state !== FS.GRAPPLING &&
      dx < TUNING.combat.grappleRange &&
      dd < 44;

    if (canLock) {
      this.grapplePartner = opponent;
      opponent.grapplePartner = this;
      opponent.breakGrappleKeepLink(this);
      this.setState(FS.GRAPPLING);
      opponent.setState(FS.GRAPPLED);
      this.grappleTimer = TUNING.combat.grappleHoldMs * this.cfg.stats.grapple;
      this.grappleHits = 0;
      opponent.struggle = 0;
      this.events.push({ type: 'grappleLock' });
    } else if (this.stateTime * 1000 > TUNING.combat.grappleStartup + 190) {
      this.setState(FS.IDLE);
    }
  }

  /** Used when a lock is established: clear the partner's own stale link only. */
  private breakGrappleKeepLink(keep: Fighter): void {
    this.grappleHits = 0;
    this.struggle = 0;
    if (this.grapplePartner && this.grapplePartner !== keep) {
      this.grapplePartner.grapplePartner = null;
    }
    this.grapplePartner = keep;
  }

  private updateGrappling(dtMs: number, intent: Intent, opponent: Fighter, heat01: number): void {
    this.grappleTimer -= dtMs;
    this.vx *= 0.7;
    this.vdepth *= 0.7;

    // hold the victim in front of us, slightly further back so both read
    opponent.x = this.x + this.facing * 52;
    opponent.depth = Math.max(0, this.depth - 0.05);
    opponent.vx = 0;

    if (intent.special && (this.canFinish || this.canSignature)) {
      const fin = this.canFinish;
      this.squelsh -= fin ? TUNING.meters.finisherCost : TUNING.meters.signatureCost;
      const move = fin ? this.cfg.moves.finisher : this.cfg.moves.signature;
      this.releaseGrapple();
      this.startMove(move, true);
      return;
    }
    if (intent.grapple || this.grappleTimer <= 0) {
      const throwMove = this.cfg.moves.grapple;
      this.releaseGrapple();
      this.startMove(throwMove, true);
      return;
    }
    if (intent.strike && this.grappleHits < 3) {
      this.grappleHits += 1;
      const knee: MoveDef = {
        ...this.cfg.moves.light,
        id: `${this.cfg.id}_grapple_knee`,
        name: 'CLINCH KNEE',
        damage: this.cfg.moves.light.damage * 0.72,
        knockback: 0,
        hitstun: 120,
        startup: 60, active: 60, recovery: 120,
      };
      const dealt = opponent.takeHit(knee, this, false);
      opponent.setState(FS.GRAPPLED);
      this.addSquelsh(3.2, heat01);
      this.events.push({ type: 'move', move: knee });
      void dealt;
      this.grappleTimer -= 120;
    }
  }

  private releaseGrapple(): void {
    const p = this.grapplePartner;
    if (p) {
      p.grapplePartner = null;
      p.setState(FS.STUN);
      p.stateTime = -0.18;
    }
    this.grapplePartner = null;
    this.grappleHits = 0;
  }

  private updateGrappled(dtMs: number, intent: Intent): void {
    void dtMs;
    if (intent.anyPress) this.struggle += 1;
    if (this.struggle >= TUNING.combat.grappleEscapeTaps) {
      const captor = this.grapplePartner;
      this.struggle = 0;
      if (captor) {
        captor.grapplePartner = null;
        captor.setState(FS.STUN);
        captor.stateTime = -0.22;
        captor.vx = -captor.facing * 130;
        this.vx = captor.facing * 150;
      }
      this.grapplePartner = null;
      this.addSquelsh(8);
      this.setState(FS.IDLE);
      this.invuln = 200;
      this.events.push({ type: 'grappleBreak' });
    }
  }

  private updateDown(dtMs: number, intent: Intent): void {
    void dtMs;
    if (this.exhausted) {
      this.koTimer += dtMs;
      return;
    }
    if (intent.anyPress) this.mash += 1;
    const need = TUNING.combat.downMs - this.mash * TUNING.combat.downMashReduction;
    if (this.stateTime * 1000 >= Math.max(420, need) && this.z <= 0.01) {
      this.setState(FS.GET_UP);
      this.events.push({ type: 'getUp' });
    }
  }

  /* ------------------------- actions ------------------------------ */

  startMove(move: MoveDef, guaranteed = false): void {
    this.setState(FS.ATTACK);
    this.action = { move, elapsed: 0, hasHit: false, guaranteed };
    if (move.lunge) this.vx += this.facing * move.lunge;
    if (move.buff) this.applyBuff(move.buff);
    this.events.push({ type: 'move', move });
  }

  startTaunt(heat01: number): void {
    this.setState(FS.TAUNT);
    this.addSquelsh(TUNING.combat.tauntSquelsh, heat01);
    this.events.push({ type: 'taunt' });
  }

  /* ------------------------- physics ------------------------------ */

  private integrate(dt: number): void {
    this.x += this.vx * dt;
    this.depth += (this.vdepth * dt) / TUNING.ring.depthPixels;

    if (this.z > 0 || this.vz !== 0) {
      this.z += this.vz * dt;
      this.vz -= TUNING.fighter.gravity * dt;
      if (this.z <= 0) { this.z = 0; this.vz = 0; }
    }

    if (LOCKED.has(this.state) || this.state === FS.IDLE) {
      const f = TUNING.fighter.friction * dt;
      this.vx -= Math.sign(this.vx) * Math.min(Math.abs(this.vx), f);
      this.vdepth -= Math.sign(this.vdepth) * Math.min(Math.abs(this.vdepth), f);
    }

    // ropes
    const half = this.ringHalfWidth;
    if (this.x < -half) {
      this.x = -half;
      if (Math.abs(this.vx) > 190) {
        this.vx = Math.abs(this.vx) * TUNING.ring.ropeBounce * 0.62;
        this.events.push({ type: 'ropeBounce' });
      } else this.vx = 0;
    } else if (this.x > half) {
      this.x = half;
      if (Math.abs(this.vx) > 190) {
        this.vx = -Math.abs(this.vx) * TUNING.ring.ropeBounce * 0.62;
        this.events.push({ type: 'ropeBounce' });
      } else this.vx = 0;
    }
    this.depth = Math.max(0, Math.min(1, this.depth));
  }

  /** Body-to-body separation, called by MatchScene after both fighters update. */
  static separate(a: Fighter, b: Fighter, dt: number): void {
    if (a.grapplePartner === b || b.grapplePartner === a) return;
    if (a.isDown || b.isDown) return;
    const dx = b.x - a.x;
    const dd = (b.depth - a.depth) * TUNING.ring.depthPixels;
    const dist = Math.hypot(dx, dd);
    const min = TUNING.fighter.bodyRadius * 1.4;
    if (dist >= min || dist === 0) return;
    const push = ((min - dist) / min) * TUNING.fighter.pushForce * dt;
    const nx = dx / dist;
    a.x -= nx * push;
    b.x += nx * push;
  }
}
