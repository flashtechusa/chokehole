import type { WrestlerConfig } from '@/game/characters/types';
import type { ArenaConfig } from '@/game/arenas/types';
import type { Intent } from '@/game/input/Intent';
import { neutralIntent } from '@/game/input/Intent';
import { TUNING } from '@/game/config/tuning';
import { Fighter, type FighterEvent } from './Fighter';
import { CombatResolver, type HitReport } from './CombatResolver';
import { ReversalSystem } from './ReversalSystem';
import { PinSystem, type PinState } from './PinSystem';
import { HeatMeter } from './MeterSystem';
import { FS } from './states';
import { RING } from './ring';
import type { PropDef } from './types';
import { AIController } from '@/game/ai/AIController';
import { AI_PROFILES, type Difficulty } from '@/game/ai/profiles';
import { RINGSIDE_PROPS } from './props';
import { Rng } from '@/game/util/rng';
import { clamp } from '@/game/util/math';

export type MatchPhase = 'ENTRANCE' | 'BELL' | 'LIVE' | 'PIN' | 'FINISH';

export interface Pickup {
  x: number;
  z: number;
  alive: boolean;
}

export interface PropPickup extends Pickup {
  def: PropDef;
}

export interface MatchInit {
  player: WrestlerConfig;
  opponent: WrestlerConfig;
  arena: ArenaConfig;
  difficulty: Difficulty;
  seed?: number;
}

export interface MatchResult {
  playerWon: boolean;
  method: 'PIN' | 'KO' | 'TIME';
  durationMs: number;
  heatPeak: number;
  bestCombo: number;
  reversals: number;
  nearFalls: number;
  aerials: number;
  finisherLanded: boolean;
  rating: number;
}

export type SimEvent =
  | { type: 'hit'; report: HitReport }
  | { type: 'reversal'; by: Fighter }
  | { type: 'fighter'; who: Fighter; event: FighterEvent }
  | { type: 'squelshSpawn'; at: Pickup }
  | { type: 'squelshTaken'; who: Fighter }
  | { type: 'propSpawn'; at: PropPickup }
  | { type: 'propTaken'; who: Fighter; def: PropDef }
  | { type: 'propDropped'; at: PropPickup }
  | { type: 'propBroke'; who: Fighter }
  | { type: 'pinStart'; attacker: Fighter; defender: Fighter }
  | { type: 'pinCount'; count: number }
  | { type: 'pinEscape'; nearFall: boolean }
  | { type: 'phase'; phase: MatchPhase }
  | { type: 'callout'; text: string; sub?: string; accent?: string }
  | { type: 'glitch'; strength: number }
  /**
   * A theatrical spot is starting. Everything above the simulation — camera,
   * lighting, broadcast graphics, audio, time itself — is expected to react.
   */
  | { type: 'spot'; kind: 'signature' | 'finisher'; who: Fighter; name: string; shout?: string }
  | { type: 'finish'; result: MatchResult };

/**
 * The whole match, with no renderer anywhere in it. MatchView reads this each
 * frame to draw, and the headless harness steps it at a fixed dt to measure
 * pacing without depending on frame rate.
 */
export class MatchSim {
  readonly p1: Fighter;
  readonly p2: Fighter;
  readonly arena: ArenaConfig;
  readonly heat = new HeatMeter();

  phase: MatchPhase = 'ENTRANCE';
  timeLeft = TUNING.match.durationMs;
  elapsed = 0;
  hitStop = 0;
  /**
   * Presentation time scale. A finisher drops the world into slow motion for a
   * beat; the clock and the AI slow with it, so it reads as a moment rather
   * than a stutter.
   */
  slowMo = 1;
  private slowMoMs = 0;

  pin: PinState | null = null;
  pinner: Fighter | null = null;
  pinned: Fighter | null = null;

  can: Pickup | null = null;
  prop: PropPickup | null = null;

  result: MatchResult | null = null;

  readonly events: SimEvent[] = [];

  private ai: AIController;
  private rng: Rng;
  private nextCanAt: number = TUNING.squelsh.firstSpawnMs;
  private nextPropAt: number = TUNING.props.spawnMs;
  private reversalCount = 0;
  private aerialCount = 0;
  private finisherLanded = false;
  /** Reset on every cover: a signature only raises the stakes of the next one. */
  private signatureSinceCover = false;
  private phaseTimer = 0;

  constructor(init: MatchInit) {
    this.arena = init.arena;
    this.rng = new Rng(init.seed ?? (Date.now() >>> 0));
    this.p1 = new Fighter(init.player, 1);
    this.p2 = new Fighter(init.opponent, -1);
    this.p1.x = -1.7; this.p1.z = 0.5;
    this.p2.x = 1.7; this.p2.z = -0.5;
    this.p1.setState(FS.ENTRANCE);
    this.p2.setState(FS.ENTRANCE);
    this.ai = new AIController(AI_PROFILES[init.difficulty], this.rng);
  }

  drainEvents(): SimEvent[] {
    const out = this.events.slice();
    this.events.length = 0;
    return out;
  }

  private emit(e: SimEvent): void { this.events.push(e); }

  private setPhase(p: MatchPhase): void {
    if (this.phase === p) return;
    this.phase = p;
    this.phaseTimer = 0;
    this.emit({ type: 'phase', phase: p });
  }

  startNow(): void {
    this.setPhase('BELL');
    this.phaseTimer = TUNING.match.introMs;
  }

  update(dtRaw: number, playerIntent: Intent): void {
    this.phaseTimer += dtRaw;

    if (this.hitStop > 0) {
      this.hitStop -= dtRaw;
      if (this.hitStop > 0) return;
    }

    if (this.slowMoMs > 0) {
      this.slowMoMs -= dtRaw;
      if (this.slowMoMs <= 0) this.slowMo = 1;
    }
    const dt = dtRaw * this.slowMo;

    switch (this.phase) {
      case 'ENTRANCE':
        if (this.phaseTimer >= TUNING.match.introMs) this.setPhase('BELL');
        this.stepFighters(dt, neutralIntent(), neutralIntent(), false);
        return;
      case 'BELL':
        if (this.phaseTimer >= TUNING.match.bellDelayMs) {
          this.p1.setState(FS.IDLE);
          this.p2.setState(FS.IDLE);
          this.setPhase('LIVE');
        }
        this.stepFighters(dt, neutralIntent(), neutralIntent(), false);
        return;
      case 'PIN':
        this.updatePin(dt, playerIntent);
        return;
      case 'FINISH':
        this.stepFighters(dt, neutralIntent(), neutralIntent(), false);
        return;
    }

    // --- LIVE ---
    this.timeLeft -= dt;
    this.elapsed += dt;
    this.heat.update(dt);

    // The arc: the same move matters more as the match goes on.
    const progress = clamp(this.elapsed / TUNING.match.durationMs, 0, 1);
    const scale = TUNING.match.damageEarly
      + (TUNING.match.damageLate - TUNING.match.damageEarly) * progress;
    this.p1.matchDamageScale = scale;
    this.p2.matchDamageScale = scale;

    this.ai.setPickups(this.can, this.prop);
    const aiIntent = this.ai.update(dt, this.p2, this.p1);
    this.stepFighters(dt, playerIntent, aiIntent, true);
    this.updatePickups();

    if (this.timeLeft <= 0) this.finishByTime();
  }

  /* ------------------------------------------------------------------ */

  private stepFighters(dt: number, i1: Intent, i2: Intent, live: boolean): void {
    const heat01 = this.heat.frac;

    if (live) {
      const scale = this.ai.profile.reversalWindowScale;
      // The player always gets the full window; the AI's is scaled by difficulty.
      ReversalSystem.arm(this.p1, this.p2, 1);
      ReversalSystem.arm(this.p2, this.p1, scale);

      if (i1.attack && this.p1.reversalArmed) {
        if (ReversalSystem.tryReverse(this.p1, this.p2, heat01)) {
          this.onReversal(this.p1);
          i1 = { ...i1, attack: false };
        }
      }
      if (i2.attack && this.p2.reversalArmed) {
        if (ReversalSystem.tryReverse(this.p2, this.p1, heat01)) {
          this.onReversal(this.p2);
          i2 = { ...i2, attack: false };
        }
      }
    }

    this.p1.pump(i1);
    this.p2.pump(i2);
    this.p1.update(dt, i1, this.p2, heat01);
    this.p2.update(dt, i2, this.p1, heat01);
    CombatResolver.separate(this.p1, this.p2, dt);

    if (live) {
      const h1 = CombatResolver.resolve(this.p1, this.p2, heat01);
      if (h1) this.onHit(h1);
      const h2 = CombatResolver.resolve(this.p2, this.p1, heat01);
      if (h2) this.onHit(h2);
    }

    this.forwardFighterEvents(this.p1);
    this.forwardFighterEvents(this.p2);

    if (live) this.checkKnockout();
  }

  private forwardFighterEvents(who: Fighter): void {
    for (const event of who.drainEvents()) {
      this.emit({ type: 'fighter', who, event });
      switch (event.type) {
        case 'taunt':
          this.heat.add(event.taunt.heat);
          this.emit({
            type: 'callout', text: event.taunt.name, sub: event.taunt.shout,
            accent: who.cfg.accent,
          });
          break;
        case 'wantsPin':
          this.tryStartPin(who);
          break;
        case 'rebound':
          this.heat.add(3);
          break;
        case 'perch':
          this.heat.add(12);
          this.emit({ type: 'callout', text: 'UP TOP', sub: 'THIS IS A BAD IDEA', accent: who.cfg.accent });
          break;
        case 'leftRing':
          this.heat.add(16);
          this.emit({ type: 'callout', text: 'OUT OF THE RING', accent: who.cfg.accent });
          break;
        case 'propTaken':
          this.prop = null;
          this.heat.add(20);
          this.emit({ type: 'propTaken', who, def: event.prop });
          this.emit({ type: 'callout', text: event.prop.name, sub: 'I.B.S. TAKES NO POSITION ON THIS', accent: who.cfg.accent });
          this.emit({ type: 'glitch', strength: 0.5 });
          break;
        case 'propDropped':
          this.prop = {
            def: this.prop?.def ?? who.cfg.prop,
            x: who.x, z: who.z, alive: true,
          };
          this.emit({ type: 'propDropped', at: this.prop });
          break;
        case 'propBroke':
          this.heat.add(18);
          this.emit({ type: 'propBroke', who });
          this.emit({ type: 'glitch', strength: 0.5 });
          this.emit({
            type: 'callout', text: 'IT BROKE', sub: 'I.B.S. PROPERTY DEPARTMENT NOTIFIED',
          });
          break;
      }
    }
  }

  private onHit(r: HitReport): void {
    // Catching someone off the ropes is a crowd moment, not just extra damage.
    this.heat.add(r.move.heat * (1 + r.combo * 0.12) * (r.counter ? 1.8 : 1) * r.fresh);
    this.hitStop = r.move.hitStopMs
      ?? (r.move.kind === 'finisher' ? TUNING.fx.hitStopFinisher
        : r.move.kind === 'heavy' || r.move.kind === 'throw' ? TUNING.fx.hitStopHeavy
          : TUNING.fx.hitStopLight);
    if (r.move.kind === 'finisher') {
      this.finisherLanded = true;
      // The production comes apart: slow motion, then the broadcast layer.
      this.slowMo = 0.35;
      this.slowMoMs = 1500;
    }
    if (r.move.kind === 'signature') this.signatureSinceCover = true;
    if (r.move.kind === 'signature' || r.move.kind === 'finisher') {
      this.emit({
        type: 'spot',
        kind: r.move.kind === 'finisher' ? 'finisher' : 'signature',
        who: r.attacker, name: r.move.name, shout: r.move.shout,
      });
    }
    if (r.move.kind === 'aerial' || r.move.kind === 'dive') {
      this.aerialCount += r.attacker === this.p1 ? 1 : 0;
      this.emit({ type: 'glitch', strength: 0.7 });
    }
    this.emit({ type: 'hit', report: r });

    const loud = r.move.kind === 'signature' || r.move.kind === 'finisher'
      || r.move.kind === 'aerial' || r.move.kind === 'dive' || r.move.kind === 'prop';
    if (loud) {
      this.emit({
        type: 'callout', text: r.move.name, sub: r.move.shout, accent: r.attacker.cfg.accent,
      });
    } else if (r.counter) {
      this.emit({
        type: 'callout', text: 'CAUGHT COMING BACK', sub: r.move.name,
        accent: r.attacker.cfg.accent,
      });
      this.emit({ type: 'glitch', strength: 0.5 });
    }
  }

  private onReversal(by: Fighter): void {
    this.reversalCount += by === this.p1 ? 1 : 0;
    this.heat.add(TUNING.reversal.heat);
    this.hitStop = TUNING.fx.hitStopHeavy;
    this.emit({ type: 'reversal', by });
    this.emit({ type: 'glitch', strength: 0.6 });
    this.emit({ type: 'callout', text: 'REVERSAL', accent: by.cfg.accent });
  }

  /* ------------------------------------------------------------------ *
   * pickups: the Squelsh can, and one oversized ringside prop
   * ------------------------------------------------------------------ */

  private updatePickups(): void {
    if (!this.can && this.elapsed >= this.nextCanAt) {
      this.can = {
        x: this.rng.range(-(RING.half - 0.9), RING.half - 0.9),
        z: this.rng.range(-(RING.halfZ - 0.7), RING.halfZ - 0.7),
        alive: true,
      };
      this.nextCanAt = this.elapsed + TUNING.squelsh.respawnMs;
      this.emit({ type: 'squelshSpawn', at: this.can });
      this.emit({ type: 'callout', text: 'SQUELSH DROP', sub: 'GRAB IT' });
    }
    if (!this.prop && this.elapsed >= this.nextPropAt) {
      /*
       * Props land INSIDE the ring. Someone sliding a comically large object
       * under the bottom rope is the joke, and it keeps the prop reachable
       * without asking the player to leave the ring and climb back in — which
       * on a phone is three deliberate actions for one gag.
       */
      const def = this.rng.pick(RINGSIDE_PROPS);
      const side = this.rng.chance(0.5) ? 1 : -1;
      this.prop = {
        def,
        x: side * this.rng.range(RING.half * 0.45, RING.half - 0.7),
        z: this.rng.range(-(RING.half - 0.8), RING.half - 0.8),
        alive: true,
      };
      this.nextPropAt = this.elapsed + TUNING.props.respawnMs;
      this.emit({ type: 'propSpawn', at: this.prop });
      this.emit({
        type: 'callout', text: `${def.name} IN THE RING`,
        sub: 'SOMEBODY SLID THAT IN',
      });
      this.emit({ type: 'glitch', strength: 0.4 });
    }

    for (const f of [this.p1, this.p2]) {
      if (f.isDown || f.isBusy) continue;
      const can = this.can;
      if (can && Math.hypot(f.x - can.x, f.z - can.z) < TUNING.squelsh.pickupRadius) {
        this.can = null;
        f.drinkSquelsh(f.cfg.squelsh);
        this.heat.add(14);
        this.emit({ type: 'squelshTaken', who: f });
        this.emit({
          type: 'callout', text: f.cfg.squelsh.label, sub: f.cfg.squelsh.blurb,
          accent: f.cfg.accent,
        });
      }
      const prop = this.prop;
      if (prop && !f.carrying && f.propCooldown <= 0
        && Math.hypot(f.x - prop.x, f.z - prop.z) < TUNING.props.pickupRadius) {
        f.takeProp(prop.def);
      }
    }
  }

  /* ------------------------------------------------------------------ *
   * pin
   * ------------------------------------------------------------------ */

  private tryStartPin(attacker: Fighter): void {
    const defender = attacker === this.p1 ? this.p2 : this.p1;
    if (!PinSystem.canPin(attacker, defender)) return;
    this.pinner = attacker;
    this.pinned = defender;
    this.pin = PinSystem.begin(defender, {
      finisherLanded: this.finisherLanded,
      signatureLanded: this.signatureSinceCover,
      matchProgress: clamp(this.elapsed / TUNING.match.durationMs, 0, 1),
    });
    attacker.setState(FS.PIN);
    defender.setState(FS.PINNED);
    attacker.x = defender.x - Math.cos(defender.facing) * 0.5;
    attacker.z = defender.z - Math.sin(defender.facing) * 0.5;
    this.setPhase('PIN');
    this.emit({ type: 'pinStart', attacker, defender });
  }

  private updatePin(dt: number, playerIntent: Intent): void {
    const p = this.pin!;
    const defender = this.pinned!;
    const attacker = this.pinner!;
    const defenderIsPlayer = defender === this.p1;
    const before = p.count;

    const tapped = defenderIsPlayer
      ? playerIntent.attack
      : this.ai.pinEscapeTap(p);

    const outcome = PinSystem.update(p, dt, defender, tapped);
    if (p.count !== before) this.emit({ type: 'pinCount', count: p.count });

    if (outcome === 'escape') {
      // Escaping on the last count is the single biggest moment in a match.
      const nearFall = p.count >= 2;
      attacker.setState(FS.IDLE);
      defender.setState(FS.GETUP);
      defender.invuln = TUNING.combat.getUpInvulnMs;
      this.pin = null; this.pinner = null; this.pinned = null;
      this.signatureSinceCover = false;

      if (nearFall) {
        defender.nearFalls += 1;
        defender.addIt(TUNING.pin.nearFallIt, this.heat.frac);
        this.heat.add(TUNING.pin.nearFallHeat);
        this.emit({ type: 'glitch', strength: 1 });
        this.emit({ type: 'callout', text: 'KICKOUT AT TWO!', sub: 'THE ROOM IS GONE', accent: defender.cfg.accent });
      } else {
        this.heat.add(20);
        this.emit({ type: 'callout', text: 'KICKOUT', accent: defender.cfg.accent });
      }
      this.setPhase('LIVE');
      this.emit({ type: 'pinEscape', nearFall });
      return;
    }
    if (outcome === 'pinned') {
      this.finish(attacker, 'PIN');
    }
  }

  /* ------------------------------------------------------------------ *
   * finish
   * ------------------------------------------------------------------ */

  private checkKnockout(): void {
    for (const f of [this.p1, this.p2]) {
      if (!f.exhausted) continue;
      // Counted on time at zero health, not on an unbroken spell lying still:
      // continuing to hit a flattened opponent used to reset the count forever.
      if (f.exhaustedMs > TUNING.match.koCountMs) {
        this.finish(f === this.p1 ? this.p2 : this.p1, 'KO');
      }
    }
  }

  private finishByTime(): void {
    const winner = this.p1.healthFrac >= this.p2.healthFrac ? this.p1 : this.p2;
    this.finish(winner, 'TIME');
  }

  private finish(winner: Fighter, method: MatchResult['method']): void {
    if (this.result) return;
    const loser = winner === this.p1 ? this.p2 : this.p1;
    winner.setState(FS.WIN);
    loser.setState(FS.LOSE);
    this.pin = null;

    const playerWon = winner === this.p1;
    // The rating rewards the show, not the result.
    const rating = clamp(
      1
      + (this.heat.peak / 100) * 1.6
      + (this.p1.bestCombo >= 3 ? 0.6 : 0)
      + (this.aerialCount > 0 ? 0.8 : 0)
      + (this.p1.nearFalls > 0 ? 0.6 : 0)
      + (this.finisherLanded ? 0.8 : 0),
      1, 5,
    );
    this.result = {
      playerWon, method,
      durationMs: this.elapsed,
      heatPeak: this.heat.peak,
      bestCombo: this.p1.bestCombo,
      reversals: this.reversalCount,
      nearFalls: this.p1.nearFalls,
      aerials: this.aerialCount,
      finisherLanded: this.finisherLanded,
      rating: Math.round(rating),
    };
    this.setPhase('FINISH');
    this.emit({ type: 'finish', result: this.result });
  }
}
