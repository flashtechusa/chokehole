import Phaser from 'phaser';
import type { ArenaConfig, WrestlerConfig } from '@/game/types';
import { TUNING } from '@/game/config/tuning';
import { C, CSS, FONT } from '@/game/config/palette';
import { BRANDING } from '@/game/config/branding';
import { getWrestler } from '@/game/data/characters';
import { getArena } from '@/game/data/arenas';
import { Fighter } from '@/game/combat/Fighter';
import { CombatSystem, type HitReport } from '@/game/combat/CombatSystem';
import { FS } from '@/game/combat/states';
import { AIController } from '@/game/ai/AIController';
import { AI_PROFILES } from '@/game/ai/profiles';
import { InputManager } from '@/game/input/InputManager';
import { neutralIntent, type Intent } from '@/game/input/Intent';
import { ArenaView } from '@/game/render/ArenaView';
import { FighterView } from '@/game/render/FighterView';
import { FX } from '@/game/fx/FX';
import { HUD } from '@/game/ui/HUD';
import { makeButton, panel } from '@/game/ui/Kit';
import { Audio } from '@/game/audio/AudioManager';
import { Save } from '@/game/save/SaveManager';
import { clamp, pick } from '@/game/utils/math';

const W = TUNING.view.width;
const H = TUNING.view.height;

export interface MatchInit {
  playerId: string;
  opponentId: string;
  arenaId: string;
  difficulty: 'EASY' | 'NORMAL' | 'BRUTAL';
  /** Optional World Tour framing. */
  tourStopId?: string;
}

export interface MatchResult extends MatchInit {
  winnerId: string;
  loserId: string;
  method: 'PIN' | 'KO' | 'TIME' | 'DRAW';
  playerWon: boolean;
  durationMs: number;
  rating: number;
  heatPeak: number;
  bestCombo: number;
  reversals: number;
  finisherHit: boolean;
}

type Phase = 'ENTRANCE' | 'BELL' | 'LIVE' | 'PIN' | 'ENDING' | 'PAUSED';

export class MatchScene extends Phaser.Scene {
  private init_!: MatchInit;
  private arenaCfg!: ArenaConfig;
  private playerCfg!: WrestlerConfig;
  private oppCfg!: WrestlerConfig;

  private p1!: Fighter;
  private p2!: Fighter;
  private v1!: FighterView;
  private v2!: FighterView;
  private arena!: ArenaView;
  private hud!: HUD;
  private fx!: FX;
  private input_!: InputManager;
  private ai!: AIController;
  private uiCam!: Phaser.Cameras.Scene2D.Camera;

  private phase: Phase = 'ENTRANCE';
  private prevPhase: Phase = 'LIVE';
  private hitStop = 0;
  private heat = 0;
  private heatPeak = 0;
  private timeLeft = TUNING.match.durationMs;
  private elapsed = 0;
  private corrupt = 0;

  // pin state
  private pinner: Fighter | null = null;
  private pinned: Fighter | null = null;
  private pinCount = 0;
  private pinTimer = 0;
  private pinTaps = 0;
  private pinNeeded = 0;
  private pinText!: Phaser.GameObjects.Text;
  private pinBacking!: Phaser.GameObjects.Graphics;
  private pinPromptSlab!: Phaser.GameObjects.Graphics;
  private pinPrompt!: Phaser.GameObjects.Text;

  // stats
  private bestCombo = 0;
  private reversals = 0;
  private finisherHit = false;

  private uiObjects: Phaser.GameObjects.GameObject[] = [];
  private entranceLayer!: Phaser.GameObjects.Container;
  private pauseLayer!: Phaser.GameObjects.Container;
  private announceText!: Phaser.GameObjects.Text;
  private announceT = 0;
  private ended = false;

  constructor() { super('Match'); }

  init(data: MatchInit): void {
    this.init_ = data;
    this.phase = 'ENTRANCE';
    this.hitStop = 0;
    this.heat = 0;
    this.heatPeak = 0;
    this.elapsed = 0;
    this.bestCombo = 0;
    this.reversals = 0;
    this.finisherHit = false;
    this.ended = false;
    this.pinner = null;
    this.pinned = null;
    this.corrupt = 0;
  }

  create(): void {
    const s = Save.settings;
    this.timeLeft = s.matchLengthMin * 60 * 1000;

    this.arenaCfg = getArena(this.init_.arenaId);
    this.playerCfg = getWrestler(this.init_.playerId);
    this.oppCfg = getWrestler(this.init_.opponentId);

    // ---- world ----
    this.arena = new ArenaView(this, this.arenaCfg);
    this.arena.setReducedFx(s.reduceFlash);

    this.p1 = new Fighter(this.playerCfg, 1);
    this.p2 = new Fighter(this.oppCfg, -1);
    this.p1.x = -150; this.p1.depth = 0.55; this.p1.facing = 1;
    this.p2.x = 150; this.p2.depth = 0.45; this.p2.facing = -1;
    this.p1.ringHalfWidth = this.arenaCfg.ringHalfWidth;
    this.p2.ringHalfWidth = this.arenaCfg.ringHalfWidth;

    this.v1 = new FighterView(this, this.playerCfg, this.arenaCfg);
    this.v2 = new FighterView(this, this.oppCfg, this.arenaCfg);

    this.fx = new FX(this);
    this.fx.setAccessibility(s.reduceFlash, s.reduceShake);

    // ---- ui ----
    this.hud = new HUD(this, this.p1, this.p2, {
      highContrast: s.highContrast, largeText: s.largeText, subtitles: s.subtitles,
    });
    this.input_ = new InputManager(this);
    this.input_.pad.setOpacity(s.controlOpacity);
    this.input_.pad.setUiScale(s.controlScale);

    this.ai = new AIController(AI_PROFILES[this.init_.difficulty]);

    this.pinBacking = this.add.graphics().setDepth(829).setAlpha(0);
    this.pinBacking.fillStyle(0x0d0612, 0.8);
    this.pinBacking.fillCircle(W / 2, 200, 82);
    this.pinBacking.lineStyle(5, C.gold, 0.9);
    this.pinBacking.strokeCircle(W / 2, 200, 82);
    this.pinText = this.add.text(W / 2, 200, '', {
      fontFamily: FONT.slam, fontSize: '120px', color: CSS.white,
      stroke: '#120a1a', strokeThickness: 12,
    }).setOrigin(0.5).setDepth(830).setAlpha(0);
    this.pinPromptSlab = this.add.graphics().setDepth(829).setAlpha(0);
    this.pinPrompt = this.add.text(W / 2, 300, '', {
      fontFamily: FONT.slam, fontSize: '26px', color: CSS.gold,
      stroke: '#120a1a', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(830).setAlpha(0);
    this.announceText = this.add.text(W / 2, 214, '', {
      fontFamily: FONT.slam, fontSize: '54px', color: CSS.pink,
      stroke: '#120a1a', strokeThickness: 10,
    }).setOrigin(0.5).setDepth(828).setAlpha(0);

    this.entranceLayer = this.add.container(0, 0).setDepth(840);
    this.pauseLayer = this.add.container(0, 0).setDepth(860).setVisible(false);

    const pauseBtn = makeButton(this, W / 2 + 132, 30, 'II', () => this.togglePause(), {
      w: 46, h: 34, size: 15, color: C.steel, skew: 5,
    });
    pauseBtn.container.setDepth(820);

    this.uiObjects = [
      this.hud.root, this.input_.pad.root, this.pinText, this.pinPrompt,
      this.announceText, this.entranceLayer, this.pauseLayer, pauseBtn.container,
      this.pinBacking, this.pinPromptSlab,
      ...this.fx.uiObjects,
    ];

    // ---- cameras ----
    const main = this.cameras.main;
    main.setBounds(-90, 0, W + 180, H);
    this.uiCam = this.cameras.add(0, 0, W, H);
    this.uiCam.setName('ui');
    this.uiCam.ignore([
      ...this.arena.objects, ...this.v1.objects, ...this.v2.objects, ...this.fx.worldObjects,
    ]);
    main.ignore(this.uiObjects);
    this.fx.setUiCamera(this.uiCam);

    // ---- pause / keyboard ----
    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
    this.buildPauseMenu();

    Audio.unlock();
    Audio.startMusic(0.25);
    this.input_.pad.setEnabled(false);
    this.startEntrance();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      Audio.stopMusic();
      Audio.setCrowd(0);
    });
  }

  /* ---------------------------------------------------------------- *
   * entrance
   * ---------------------------------------------------------------- */

  private startEntrance(): void {
    const layer = this.entranceLayer;
    const a = this.arenaCfg;

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.72);
    bg.fillRect(0, 0, W, H);
    layer.add(bg);

    const g = panel(this, 96, 54, W - 192, 200, C.gold, 0.1);
    layer.add(g);

    layer.add(this.add.text(W / 2, 68, `${BRANDING.network} ARCHIVE TAPE`, {
      fontFamily: FONT.mono, fontSize: '11px', color: CSS.gold,
    }).setOrigin(0.5));
    layer.add(this.add.text(W / 2, 92, a.displayName, {
      fontFamily: FONT.slam, fontSize: '30px', color: CSS.white,
      align: 'center', wordWrap: { width: W - 240 },
    }).setOrigin(0.5, 0));
    layer.add(this.add.text(W / 2, 136,
      `${a.history.venue} · ${a.history.city} · ${a.history.date}`, {
      fontFamily: FONT.mono, fontSize: '11px', color: CSS.acid,
    }).setOrigin(0.5, 0));
    layer.add(this.add.text(W / 2, 158, a.history.note, {
      fontFamily: FONT.mono, fontSize: '10px', color: CSS.bone,
      align: 'center', wordWrap: { width: W - 260 }, lineSpacing: 3,
    }).setOrigin(0.5, 0).setAlpha(0.8));
    layer.add(this.add.text(W / 2, 232,
      `REAL HISTORY [${a.history.research}] — THE MATCH ITSELF IS GAME FICTION`, {
      fontFamily: FONT.mono, fontSize: '9px', color: CSS.gold,
    }).setOrigin(0.5, 0).setAlpha(0.75));

    const band = this.add.graphics();
    band.fillStyle(0x0d0612, 0.72);
    band.fillRect(0, 292, W, 118);
    band.fillStyle(C.gold, 0.55);
    band.fillRect(0, 292, W, 2);
    band.fillRect(0, 408, W, 2);
    layer.add(band);

    const nameL = this.add.text(150, 320, this.playerCfg.displayName, {
      fontFamily: FONT.slam, fontSize: '44px', color: CSS.pink,
      stroke: '#120a1a', strokeThickness: 8,
    }).setOrigin(0.5).setAngle(-5).setAlpha(0);
    const quoteL = this.add.text(150, 360, `“${this.playerCfg.quotes.entrance}”`, {
      fontFamily: FONT.mono, fontSize: '10px', color: CSS.bone,
      align: 'center', wordWrap: { width: 260 },
    }).setOrigin(0.5).setAlpha(0);
    const vs = this.add.text(W / 2, 336, 'VS', {
      fontFamily: FONT.slam, fontSize: '52px', color: CSS.gold,
      stroke: '#120a1a', strokeThickness: 8,
    }).setOrigin(0.5).setAlpha(0);
    const nameR = this.add.text(W - 150, 320, this.oppCfg.displayName, {
      fontFamily: FONT.slam, fontSize: '44px', color: CSS.acid,
      stroke: '#120a1a', strokeThickness: 8,
    }).setOrigin(0.5).setAngle(5).setAlpha(0);
    const quoteR = this.add.text(W - 150, 360, `“${this.oppCfg.quotes.entrance}”`, {
      fontFamily: FONT.mono, fontSize: '10px', color: CSS.bone,
      align: 'center', wordWrap: { width: 260 },
    }).setOrigin(0.5).setAlpha(0);
    layer.add([nameL, quoteL, vs, nameR, quoteR]);

    this.tweens.add({ targets: [nameL, quoteL], alpha: 1, x: '+=0', duration: 260, delay: 500 });
    this.tweens.add({ targets: [nameR, quoteR], alpha: 1, duration: 260, delay: 1100 });
    this.tweens.add({ targets: vs, alpha: 1, scale: { from: 3, to: 1 }, duration: 320, delay: 1700 });

    this.time.delayedCall(520, () => Audio.play('crowdPop', 0.6));
    this.time.delayedCall(1120, () => Audio.play('crowdPop', 0.6));
    this.time.delayedCall(1720, () => Audio.play('buzz', 0.7));

    const skip = makeButton(this, W / 2, 470, 'SKIP ENTRANCE', () => this.endEntrance(), {
      w: 240, h: 46, size: 18, color: C.pink,
    });
    layer.add(skip.container);

    this.time.delayedCall(TUNING.match.introMs, () => {
      if (this.phase === 'ENTRANCE') this.endEntrance();
    });
  }

  private endEntrance(): void {
    if (this.phase !== 'ENTRANCE') return;
    this.entranceLayer.setVisible(false);
    this.entranceLayer.removeAll(true);
    this.phase = 'BELL';
    this.input_.pad.setEnabled(true);
    Audio.play('bell');
    Audio.play('crowdPop', 0.9);
    this.announce('CHOKE HOLE!', C.pink);
    this.hud.showCallout(
      `${this.playerCfg.displayName} vs ${this.oppCfg.displayName}`,
      pick(this.playerCfg.quotes.taunt),
    );
    this.time.delayedCall(TUNING.match.startDelayMs, () => {
      if (this.phase === 'BELL') {
        this.phase = 'LIVE';
        this.announce('FIGHT', C.acid);
      }
    });
  }

  private announce(text: string, color: number): void {
    this.announceText.setText(text)
      .setColor(`#${color.toString(16).padStart(6, '0')}`)
      .setAlpha(1).setScale(2.4);
    this.announceT = 1200;
    this.tweens.add({ targets: this.announceText, scale: 1, duration: 260, ease: 'Back.easeOut' });
    Audio.playVO(1);
  }

  /* ---------------------------------------------------------------- *
   * pause
   * ---------------------------------------------------------------- */

  private buildPauseMenu(): void {
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.8);
    bg.fillRect(0, 0, W, H);
    this.pauseLayer.add(bg);
    this.pauseLayer.add(panel(this, W / 2 - 200, 120, 400, 300, C.pink, 0.12));
    this.pauseLayer.add(this.add.text(W / 2, 146, 'BROADCAST PAUSED', {
      fontFamily: FONT.slam, fontSize: '28px', color: CSS.white,
    }).setOrigin(0.5));
    this.pauseLayer.add(makeButton(this, W / 2, 216, 'RESUME', () => this.togglePause(),
      { w: 300, h: 50, color: C.acid }).container);
    this.pauseLayer.add(makeButton(this, W / 2, 278, 'RESTART MATCH', () => {
      this.scene.restart(this.init_);
    }, { w: 300, h: 50, color: C.gold, size: 20 }).container);
    this.pauseLayer.add(makeButton(this, W / 2, 340, 'QUIT TO MENU', () => {
      Audio.stopMusic();
      this.scene.start('Menu');
    }, { w: 300, h: 50, color: C.steel, size: 20 }).container);
  }

  private togglePause(): void {
    if (this.phase === 'ENDING') return;
    if (this.phase === 'PAUSED') {
      this.phase = this.prevPhase;
      this.pauseLayer.setVisible(false);
      this.input_.pad.setFrozen(false);
      this.input_.reset();
    } else {
      this.prevPhase = this.phase;
      this.phase = 'PAUSED';
      this.pauseLayer.setVisible(true);
      this.input_.pad.setFrozen(true);
      Audio.setCrowd(0.05);
    }
  }

  /* ---------------------------------------------------------------- *
   * loop
   * ---------------------------------------------------------------- */

  override update(_time: number, delta: number): void {
    const dt = Math.min(delta, 42);

    if (this.announceT > 0) {
      this.announceT -= dt;
      if (this.announceT <= 0) this.announceText.setAlpha(0);
      else this.announceText.setAlpha(Math.min(1, this.announceT / 260));
    }

    if (this.phase === 'PAUSED') {
      this.arena.update(0, this.cameras.main.scrollX, this.heat / 100, false);
      return;
    }

    const live = this.phase === 'LIVE';
    let step = dt;
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      step = 0;
    }

    const pIntent = this.phase === 'ENTRANCE' ? neutralIntent() : this.input_.update();
    const aIntent = this.ai.update(dt, this.p2, this.p1, live);

    if (this.phase === 'PIN') {
      this.updatePin(dt, pIntent, aIntent);
    } else if (step > 0 && (live || this.phase === 'BELL' || this.phase === 'ENDING')) {
      this.updateFighters(step, live ? pIntent : neutralIntent(), live ? aIntent : neutralIntent());
    }

    if (live) {
      this.timeLeft -= dt;
      this.elapsed += dt;
      if (this.timeLeft <= 0) this.endByTime();
    }

    // heat decay
    this.heat = clamp(this.heat - (TUNING.meters.heatDecayPerSec * dt) / 1000, 0, 100);
    this.heatPeak = Math.max(this.heatPeak, this.heat);

    const heat01 = this.heat / 100;
    const eventActive = heat01 > 0.66 || this.phase === 'ENDING';

    this.v1.update(this.p1, step, Save.settings.reduceFlash);
    this.v2.update(this.p2, step, Save.settings.reduceFlash);

    this.updateCamera(dt);
    this.arena.update(dt, this.cameras.main.scrollX, heat01, eventActive);
    this.fx.update(dt, heat01, this.corrupt);
    this.corrupt = Math.max(0, this.corrupt - dt / 700);
    this.hud.update(dt, this.p1, this.p2, heat01, this.timeLeft, this.corrupt);

    Audio.setCrowd(0.18 + heat01 * 0.82);
    Audio.setMusicIntensity(0.2 + heat01 * 0.8);

    this.input_.pad.setSpecialGlow(this.p1.canFinish ? 2 : this.p1.canSignature ? 1 : 0);

    // crowd-press arenas physically shrink the ring
    const hw = this.arena.ringHalfWidthFor(heat01);
    this.p1.ringHalfWidth = hw;
    this.p2.ringHalfWidth = hw;
  }

  private updateFighters(step: number, pIntent: Intent, aIntent: Intent): void {
    const heat01 = this.heat / 100;
    this.p1.update(step, pIntent, this.p2, heat01);
    this.p2.update(step, aIntent, this.p1, heat01);
    Fighter.separate(this.p1, this.p2, step / 1000);

    const h1 = CombatSystem.resolve(this.p1, this.p2, heat01);
    const h2 = CombatSystem.resolve(this.p2, this.p1, heat01);
    if (h1) this.onHit(h1);
    if (h2) this.onHit(h2);

    this.drainEvents(this.p1);
    this.drainEvents(this.p2);

    if (this.phase === 'LIVE') this.checkKO();
  }

  /* ---------------------------------------------------------------- *
   * events / hits
   * ---------------------------------------------------------------- */

  private drainEvents(f: Fighter): void {
    for (const e of f.events) {
      switch (e.type) {
        case 'move': {
          const m = e.move;
          if (m.kind === 'heavy') Audio.play('whoosh', 0.6);
          else if (m.kind === 'signature') { Audio.play('squelsh', 0.9); this.onSpecial(f, false); }
          else if (m.kind === 'finisher') { Audio.play('finisher', 1); this.onSpecial(f, true); }
          else if (m.kind === 'grapple') Audio.play('grapple', 0.8);
          break;
        }
        case 'taunt':
          this.addHeat(TUNING.combat.tauntHeat, f);
          Audio.play('crowdPop', 0.45);
          this.hud.showCallout(`${f.cfg.displayName} PLAYS TO THE CROWD`, pick(f.cfg.quotes.taunt));
          break;
        case 'ropeBounce':
          Audio.play('rope', 0.7);
          this.addHeat(3, f);
          break;
        case 'grappleLock':
          Audio.play('grapple', 0.7);
          break;
        case 'grappleBreak':
          Audio.play('reversal', 0.6);
          this.addHeat(5, f);
          this.fx.callout('BREAK!', this.screenX(f), this.screenY(f) - 90, C.cyan);
          break;
        case 'getUp':
          this.addHeat(2, f);
          break;
        case 'exhausted':
          this.hud.showCallout(`${f.cfg.displayName} IS OUT OF IT`, f.cfg.quotes.lose);
          this.corrupt = 1;
          Audio.play('buzz', 0.8);
          break;
        case 'buff':
          this.fx.callout(e.buff.label, this.screenX(f), this.screenY(f) - 110, f.cfg.rig.aura);
          break;
      }
    }
    f.events.length = 0;
  }

  private onSpecial(f: Fighter, finisher: boolean): void {
    const move = finisher ? f.cfg.moves.finisher : f.cfg.moves.signature;
    this.fx.callout(move.name, this.screenX(f), this.screenY(f) - 120, f.cfg.rig.aura, true);
    this.hud.showCallout(move.name, pick(f.cfg.quotes.taunt));
    this.addHeat(finisher ? 26 : 16, f);
    this.fx.cameraFlash(finisher ? 0.8 : 0.4);
    this.corrupt = finisher ? 1 : 0.5;
    this.cameras.main.zoomTo(finisher ? 1.14 : 1.08, 220);
    this.time.delayedCall(finisher ? 900 : 520, () => this.cameras.main.zoomTo(1, 320));
    if (f.cfg.id === 'raid') this.fx.slime(this.screenX(f), this.screenY(f) - 60, C.acid, finisher ? 22 : 12);
    if (finisher && this.arenaCfg.event.kind === 'confettiRig') this.fx.confetti(W / 2, 54);
  }

  private onHit(h: HitReport): void {
    const x = TUNING.ring.centerX + h.x;
    const y = TUNING.ring.baseY + h.depth * this.arenaCfg.ringDepth - h.z;

    if (h.reversed) {
      this.reversals += 1;
      Audio.play('reversal');
      this.fx.callout('REVERSAL!', x, y - 40, C.cyan, true);
      this.fx.hit(x, y, C.cyan, 0.8);
      this.fx.cameraFlash(0.35);
      this.addHeat(13, h.defender);
      this.hitStop = TUNING.fx.hitStopHeavy;
      this.fx.shake(this.cameras.main, TUNING.fx.shakeHeavy);
      this.hud.showCallout(`${h.defender.cfg.displayName} REVERSES IT`);
      this.hud.bumpViewers(52_000);
      return;
    }

    if (h.blocked) {
      Audio.play('slap', 0.4);
      this.fx.hit(x, y, 0x9fb8ff, 0.35);
      this.hitStop = 24;
      return;
    }

    const m = h.move;
    const heavy = m.kind !== 'light';
    Audio.play(m.kind === 'light' ? 'slap' : m.kind === 'finisher' ? 'finisher' : 'heavy',
      m.kind === 'finisher' ? 1 : 0.8);

    this.fx.hit(x, y, m.impactTint ?? C.pink, heavy ? 1 : 0.55);
    this.hitStop = m.kind === 'finisher'
      ? TUNING.fx.hitStopFinisher
      : heavy ? TUNING.fx.hitStopHeavy : TUNING.fx.hitStopLight;
    this.fx.shake(this.cameras.main, m.shake ?? TUNING.fx.shakeLight, heavy ? 220 : 120);

    if (m.callout && heavy) {
      this.fx.callout(m.callout, x, y - 46, m.impactTint ?? C.white, m.kind === 'finisher');
    }

    this.addHeat(m.heat + h.combo * TUNING.meters.heatComboBonus, h.attacker);
    this.bestCombo = Math.max(this.bestCombo, h.combo);
    if (h.combo >= 3) this.hud.bumpViewers(9000 * h.combo);

    if (m.kind === 'finisher') {
      this.finisherHit = true;
      this.fx.cameraFlash(0.9);
      this.hud.showCallout(`${h.attacker.cfg.displayName} HITS ${m.name}`, pick(h.attacker.cfg.quotes.win));
      this.hud.bumpViewers(420_000);
      if (this.arenaCfg.event.kind === 'confettiRig') this.fx.confetti(W / 2, 60);
      Audio.play('crowdPop', 1);
    } else if (heavy) {
      Audio.play('crowdPop', 0.35);
    }
  }

  private addHeat(amount: number, source: Fighter): void {
    let mult = 1;
    const bonus = source.cfg.venueBonus?.find((b) => b.arenaId === this.arenaCfg.id);
    if (bonus) mult *= bonus.heatMult;
    mult *= this.arenaCfg.crowdIntensity;
    this.heat = clamp(this.heat + amount * mult, 0, 100);
    this.heatPeak = Math.max(this.heatPeak, this.heat);
  }

  /* ---------------------------------------------------------------- *
   * pin / KO
   * ---------------------------------------------------------------- */

  private checkKO(): void {
    for (const [a, b] of [[this.p1, this.p2], [this.p2, this.p1]] as [Fighter, Fighter][]) {
      if (b.exhausted && b.koTimer > TUNING.combat.koCountMs) {
        this.finish(a, b, 'KO');
        return;
      }
      if (a.pendingPin) {
        a.pendingPin = false;
        this.tryStartPin(a, b);
      }
    }
  }

  private tryStartPin(attacker: Fighter, defender: Fighter): void {
    if (this.phase !== 'LIVE') return;
    if (!defender.isDown) return;
    const dx = Math.abs(defender.x - attacker.x);
    if (dx > TUNING.combat.pinRange) return;

    this.phase = 'PIN';
    this.pinner = attacker;
    this.pinned = defender;
    attacker.setState(FS.PIN);
    defender.setState(FS.PINNED);
    attacker.x = defender.x - attacker.facing * 46;
    attacker.depth = Math.min(1, defender.depth + 0.07);
    this.pinCount = 0;
    this.pinTimer = TUNING.combat.pinCountMs;
    this.pinTaps = 0;

    const hurt = defender.healthFrac;
    this.pinNeeded = defender.exhausted
      ? 999
      : Math.max(2, Math.round(TUNING.combat.pinEscapeTapsBase * (0.35 + hurt * 1.15)));

    this.pinText.setAlpha(1).setText('');
    this.pinBacking.setAlpha(0);
    this.pinPrompt.setAlpha(1).setText(
      defender === this.p1 ? 'MASH ANY BUTTON TO KICK OUT' : `${attacker.cfg.displayName} GOES FOR THE PIN`,
    );
    const pw = this.pinPrompt.width + 44;
    this.pinPromptSlab.clear();
    this.pinPromptSlab.fillStyle(0x0d0612, 0.85);
    this.pinPromptSlab.fillRect(W / 2 - pw / 2, 286, pw, 34);
    this.pinPromptSlab.lineStyle(2, C.gold, 0.9);
    this.pinPromptSlab.strokeRect(W / 2 - pw / 2, 286, pw, 34);
    this.pinPromptSlab.setAlpha(1);
    Audio.play('crowdPop', 0.7);
    this.hud.showCallout(`${attacker.cfg.displayName} COVERS ${defender.cfg.displayName}`);
    this.cameras.main.zoomTo(1.1, 260);
  }

  private updatePin(dt: number, pIntent: Intent, aIntent: Intent): void {
    const attacker = this.pinner!;
    const defender = this.pinned!;
    const defIntent = defender === this.p1 ? pIntent : aIntent;

    // keep the cover readable: attacker slightly nearer the camera, off to one side
    attacker.x = defender.x - attacker.facing * 46;
    attacker.depth = Math.min(1, defender.depth + 0.07);

    if (defIntent.anyPress) this.pinTaps += 1;

    if (this.pinTaps >= this.pinNeeded) {
      this.endPin(false);
      return;
    }

    this.pinTimer -= dt;
    if (this.pinTimer <= 0) {
      this.pinCount += 1;
      this.pinTimer = TUNING.combat.pinCountMs;
      Audio.play('pinSlap', 1);
      Audio.playVO(1);
      this.pinBacking.setAlpha(1);
      this.pinText.setText(String(this.pinCount)).setScale(2.2).setAlpha(1);
      this.tweens.add({ targets: this.pinText, scale: 1, duration: 220, ease: 'Back.easeOut' });
      this.addHeat(6, attacker);
      if (this.pinCount >= 3) {
        this.finish(attacker, defender, 'PIN');
        return;
      }
    }

    // near-fall tension
    if (this.pinCount === 2) this.corrupt = 0.6;
    this.pinPrompt.setAlpha(0.55 + 0.45 * Math.sin(this.pinTimer / 60));
    this.pinPromptSlab.setAlpha(0.9);
  }

  private endPin(pinned: boolean): void {
    const attacker = this.pinner;
    const defender = this.pinned;
    this.pinner = null;
    this.pinned = null;
    this.pinText.setAlpha(0);
    this.pinBacking.setAlpha(0);
    this.pinPrompt.setAlpha(0);
    this.pinPromptSlab.setAlpha(0);
    this.cameras.main.zoomTo(1, 260);
    if (pinned || !attacker || !defender) return;

    this.phase = 'LIVE';
    defender.setState(FS.GET_UP);
    defender.invuln = 420;
    defender.exhausted = false;
    defender.health = Math.max(defender.health, 1);
    attacker.stun(420);
    attacker.vx = -attacker.facing * 160;
    this.addHeat(18, defender);
    this.fx.cameraFlash(0.45);
    this.fx.callout('KICKOUT!', this.screenX(defender), this.screenY(defender) - 80, C.gold, true);
    this.hud.showCallout(`${defender.cfg.displayName} KICKS OUT AT ${this.pinCount}!`);
    this.hud.bumpViewers(180_000);
    Audio.play('crowdPop', 1);
  }

  private endByTime(): void {
    if (this.ended) return;
    const a = this.p1.healthFrac;
    const b = this.p2.healthFrac;
    if (Math.abs(a - b) < 0.02) this.finish(null, null, 'DRAW');
    else if (a > b) this.finish(this.p1, this.p2, 'TIME');
    else this.finish(this.p2, this.p1, 'TIME');
  }

  private finish(winner: Fighter | null, loser: Fighter | null, method: MatchResult['method']): void {
    if (this.ended) return;
    this.ended = true;
    this.phase = 'ENDING';
    this.pinText.setAlpha(0);
    this.pinBacking.setAlpha(0);
    this.pinPrompt.setAlpha(0);
    this.pinPromptSlab.setAlpha(0);
    this.input_.pad.setEnabled(false);
    this.cameras.main.zoomTo(1, 300);

    if (winner) winner.setState(FS.WIN);
    if (loser) loser.setState(FS.LOSE);

    Audio.play('bell', 1);
    Audio.play('crowdPop', 1);
    this.fx.cameraFlash(0.6);
    if (this.arenaCfg.event.kind === 'confettiRig' || this.heat > 70) this.fx.confetti(W / 2, 70);
    this.announce(method === 'DRAW' ? 'TIME LIMIT DRAW' : 'WINNER', C.gold);

    const playerWon = winner === this.p1;
    const rating = this.computeRating(playerWon, method);

    const result: MatchResult = {
      ...this.init_,
      winnerId: winner?.cfg.id ?? '',
      loserId: loser?.cfg.id ?? '',
      method,
      playerWon,
      durationMs: this.elapsed,
      rating,
      heatPeak: this.heatPeak,
      bestCombo: this.bestCombo,
      reversals: this.reversals,
      finisherHit: this.finisherHit,
    };

    Save.recordMatch(this.init_.playerId, playerWon, rating, this.heatPeak);
    if (this.init_.tourStopId && playerWon) Save.markTourStop(this.init_.tourStopId);

    this.time.delayedCall(1900, () => {
      Audio.stopMusic();
      this.scene.start('Results', result);
    });
  }

  private computeRating(playerWon: boolean, method: MatchResult['method']): number {
    let score = 0;
    score += (this.heatPeak / 100) * 2.2;
    score += Math.min(1, this.bestCombo / 6) * 0.8;
    score += Math.min(1, this.reversals / 4) * 0.8;
    if (this.finisherHit) score += 0.6;
    if (method === 'PIN') score += 0.4;
    if (playerWon) score += 0.4;
    return Math.max(1, Math.min(5, Math.round(score)));
  }

  /* ---------------------------------------------------------------- *
   * camera / helpers
   * ---------------------------------------------------------------- */

  private updateCamera(dt: number): void {
    const cam = this.cameras.main;
    const mid = (this.p1.x + this.p2.x) / 2;
    const spread = Math.abs(this.p1.x - this.p2.x);
    const targetScroll = clamp(mid * 0.34, -80, 80);
    cam.scrollX += (targetScroll - cam.scrollX) * Math.min(1, dt / 170);

    if (this.phase !== 'PIN' && !this.tweens.isTweening(cam)) {
      const targetZoom = clamp(1.1 - spread / 2600, 1.0, 1.09);
      cam.zoom += (targetZoom - cam.zoom) * Math.min(1, dt / 420);
    }
  }

  private screenX(f: Fighter): number { return TUNING.ring.centerX + f.x; }
  private screenY(f: Fighter): number {
    return TUNING.ring.baseY + f.depth * this.arenaCfg.ringDepth - f.z;
  }
}
