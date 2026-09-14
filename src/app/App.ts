import type { Difficulty } from '@/game/ai/profiles';
import { MatchSim, type MatchResult, type SimEvent } from '@/game/combat/MatchSim';
import { getWrestler } from '@/game/characters';
import { getArena } from '@/game/arenas';
import { Save } from '@/game/save/SaveManager';
import { AudioManager } from '@/game/audio/AudioManager';
import { createStage, PRESETS, type Quality, type Stage } from '@/render/Engine';
import { MatchView } from '@/render/MatchView';
import { Hud } from '@/ui/Hud';
import { TouchPad } from '@/ui/TouchPad';
import {
  archiveCard, howToScreen, pauseScreen, resultScreen, titleScreen,
} from '@/ui/Screens';
import { h } from '@/ui/dom';
import { Broadcast, bumperCard } from '@/ui/Broadcast';
import { FS } from '@/game/combat/states';
import { RING, nearestCorner } from '@/game/combat/ring';
import { CANON } from '@/game/config/canon';
import { TUNING } from '@/game/config/tuning';
import { neutralIntent, type Intent } from '@/game/input/Intent';

type Screen = 'TITLE' | 'HOWTO' | 'ARCHIVE' | 'MATCH' | 'RESULT';

const PLAYER_ID = 'jassy';
const OPPONENT_ID = 'raid';
const ARENA_ID = 'nola-warehouse-2018';

/**
 * Application shell. Owns the Babylon stage, routes between HTML screens, and
 * runs the match loop. The simulation is created and destroyed per match; the
 * stage is built once and reused, so REMATCH never reloads the page.
 */
export class App {
  private stage: Stage;
  private ui: HTMLElement;
  private audio = AudioManager.instance;

  private sim: MatchSim | null = null;
  private view: MatchView | null = null;
  private hud: Hud | null = null;
  private pad = new TouchPad();
  private broadcast = new Broadcast();
  private pauseBtn: HTMLButtonElement;

  private screen: Screen = 'TITLE';
  private panel: HTMLElement | null = null;
  private paused = false;
  private difficulty: Difficulty;

  // rolling frame time, for the automatic quality tier
  private frameAvg = 16.7;
  private qualityCooldown = 0;

  constructor(canvas: HTMLCanvasElement, ui: HTMLElement) {
    this.ui = ui;
    this.stage = createStage(canvas, getArena(ARENA_ID));
    this.difficulty = Save.settings.difficulty;
    this.audio.applySettings(Save.settings);

    const forced = Save.settings.quality;
    if (forced) this.stage.setQuality(forced);

    this.pauseBtn = h('button', 'btn-pause');
    this.pauseBtn.textContent = '❚❚';
    this.pauseBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.togglePause();
    });

    this.ui.appendChild(this.broadcast.root);
    this.ui.appendChild(this.pad.root);
    this.ui.appendChild(this.pauseBtn);
    this.setMatchUiVisible(false);

    this.bindLifecycle();
    this.showTitle();

    this.stage.engine.runRenderLoop(() => this.frame());
  }

  /* ------------------------------------------------------------------ *
   * lifecycle
   * ------------------------------------------------------------------ */

  private bindLifecycle(): void {
    // Pause if the browser or tab loses focus (Bible s32).
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.screen === 'MATCH' && !this.paused) this.togglePause();
    });
    window.addEventListener('blur', () => {
      if (this.screen === 'MATCH' && !this.paused) this.togglePause();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.screen === 'MATCH') this.togglePause();
    });
    const orient = (): void => {
      document.body.classList.toggle('portrait', window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', orient);
    window.addEventListener('orientationchange', orient);
    orient();
  }

  /* ------------------------------------------------------------------ *
   * screens
   * ------------------------------------------------------------------ */

  private setPanel(el: HTMLElement | null): void {
    this.panel?.remove();
    this.panel = el;
    if (el) this.ui.appendChild(el);
  }

  private setMatchUiVisible(v: boolean): void {
    this.pad.setEnabled(v);
    this.pauseBtn.style.display = v ? '' : 'none';
    this.hud?.setVisible(v);
  }

  private showTitle(): void {
    this.screen = 'TITLE';
    this.teardownMatch();
    this.setMatchUiVisible(false);
    const s = Save.get();
    const record = s.totalMatches > 0
      ? `RECORD ${s.totalWins}W / ${s.totalMatches - s.totalWins}L`
      : 'FIRST TIME? START HERE';
    this.setPanel(titleScreen(
      () => { this.audio.unlock(); this.showArchive(); },
      () => { this.audio.unlock(); this.showHowTo(); },
      record,
    ));
  }

  private showHowTo(): void {
    this.screen = 'HOWTO';
    Save.markHowToSeen();
    this.setPanel(howToScreen(() => this.showTitle()));
  }

  private showArchive(): void {
    this.screen = 'ARCHIVE';
    this.setPanel(archiveCard(getArena(ARENA_ID), () => this.startMatch()));
  }

  /* ------------------------------------------------------------------ *
   * match
   * ------------------------------------------------------------------ */

  private startMatch(): void {
    this.teardownMatch();
    this.screen = 'MATCH';
    this.paused = false;
    this.setPanel(null);

    const player = getWrestler(PLAYER_ID);
    const opponent = getWrestler(OPPONENT_ID);
    const arena = getArena(ARENA_ID);

    this.sim = new MatchSim({ player, opponent, arena, difficulty: this.difficulty });
    this.view = new MatchView(this.stage.scene, this.sim);
    this.view.setReducedFx(Save.settings.reduceFlash, Save.settings.reduceShake);
    this.broadcast.setReduceFlash(Save.settings.reduceFlash);
    this.broadcast.clear();

    this.hud = new Hud(this.sim.p1, this.sim.p2);
    this.ui.insertBefore(this.hud.root, this.pad.root);
    this.setMatchUiVisible(true);

    this.audio.unlock();
    this.audio.startMusic(0.25);
    this.audio.play('bell', 0.8);
    this.hud.showCallout(`${player.displayName} vs ${opponent.displayName}`, player.quotes.entrance, player.accent);
  }

  private teardownMatch(): void {
    this.audio.stopMusic();
    this.audio.setCrowd(0);
    this.view?.dispose();
    this.view = null;
    this.sim = null;
    this.hud?.root.remove();
    this.hud = null;
  }

  private togglePause(): void {
    if (this.screen !== 'MATCH') return;
    this.paused = !this.paused;
    if (this.paused) {
      this.setPanel(pauseScreen(
        this.difficulty,
        () => { this.paused = false; this.setPanel(null); },
        (d) => {
          this.difficulty = d;
          Save.updateSettings({ difficulty: d });
          this.paused = false;
          this.setPanel(null);
          this.startMatch();
        },
        () => { this.showTitle(); },
      ));
    } else {
      this.setPanel(null);
    }
  }

  private finishMatch(result: MatchResult): void {
    const player = getWrestler(PLAYER_ID);
    const opponent = getWrestler(OPPONENT_ID);
    Save.recordMatch(PLAYER_ID, result.playerWon, result.rating, result.heatPeak);
    this.audio.play(result.playerWon ? 'crowdPop' : 'buzz', 0.9);

    // Let the victory camera breathe before the card comes up.
    window.setTimeout(() => {
      if (this.screen !== 'MATCH') return;
      this.screen = 'RESULT';
      this.setMatchUiVisible(false);
      const panel = resultScreen(
        result, player, opponent,
        () => this.startMatch(),
        () => this.showTitle(),
      );
      // A commercial break between matches: broadcast comedy belongs here.
      panel.appendChild(bumperCard());
      this.setPanel(panel);
    }, 2600);
  }

  /* ------------------------------------------------------------------ *
   * frame
   * ------------------------------------------------------------------ */

  private frame(): void {
    const raw = this.stage.engine.getDeltaTime();
    const dt = Math.min(Math.max(raw, 1), 42);
    this.frameAvg += (raw - this.frameAvg) * 0.05;
    this.autoQuality(dt);

    if (this.sim && this.view && this.hud && this.screen === 'MATCH' && !this.paused) {
      const intent = this.cameraRelative(this.pad.consume());
      this.sim.update(dt, intent);

      const events = this.sim.drainEvents();
      if (events.length) {
        this.view.handleEvents(events);
        this.playEventAudio(events);
        for (const e of events) {
          if (e.type === 'callout') this.hud.showCallout(e.text, e.sub, e.accent);
          if (e.type === 'pinCount') this.hud.flashCue(String(e.count), 500);
          if (e.type === 'glitch') this.broadcast.tear(e.strength);
          if (e.type === 'spot') {
            this.broadcast.showSpot(e.kind, e.name, e.who.cfg.accent, e.shout);
          }
          if (e.type === 'hit' && e.report.move.kind === 'finisher') {
            this.broadcast.censorBar(1900);
            this.broadcast.tear(1);
          }
          if (e.type === 'finish') this.finishMatch(e.result);
        }
      }

      this.view.update(dt);
      this.hud.update(dt, this.sim);
      this.broadcast.update(dt);
      this.pad.setSpecialState(
        this.sim.p1.canFinish ? 'finisher' : this.sim.p1.canSignature ? 'signature' : 'taunt',
      );
      this.updateContextLabels();

      const heat = this.sim.heat.frac;
      this.audio.setCrowd(0.16 + heat * 0.84);
      this.audio.setMusicIntensity(0.2 + heat * 0.8);
    } else if (this.view) {
      // Keep the room alive behind menus and the pause panel.
      this.view.update(Math.min(dt, 33));
      this.broadcast.update(dt);
    }

    this.stage.scene.render();
  }

  /**
   * Rotates the stick into the camera's frame, so "up" always means away from
   * the viewer no matter where the director has drifted the camera to.
   */
  private cameraRelative(i: Intent): Intent {
    if (!this.view) return i;
    if (i.moveX === 0 && i.moveY === 0) return i;
    const yaw = this.view.camera.yawNow;
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const out: Intent = { ...i };
    out.moveX = c * i.moveX + s * i.moveY;
    out.moveY = s * i.moveX - c * i.moveY;
    return out;
  }

  private playEventAudio(events: SimEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case 'hit': {
          const k = e.report.move.kind;
          if (k === 'finisher') this.audio.play('finisher', 1);
          else if (k === 'signature' || k === 'aerial' || k === 'dive') this.audio.play('heavy', 1);
          else if (k === 'heavy' || k === 'throw' || k === 'rebound' || k === 'prop') {
            this.audio.play('heavy', 0.9);
          } else this.audio.play('slap', 0.85);
          if (e.report.move.knockdown) this.audio.play('thud', 0.85);
          // The crowd only pops for things worth popping for.
          if (k === 'aerial' || k === 'dive' || k === 'prop' || k === 'rebound') {
            this.audio.play('crowdPop', 0.9);
          } else if (e.report.combo >= 3) this.audio.play('crowdPop', 0.5);
          break;
        }
        case 'reversal': this.audio.play('reversal', 1); this.audio.play('crowdPop', 0.85); break;
        case 'squelshSpawn': this.audio.play('buzz', 0.7); break;
        case 'squelshTaken': this.audio.play('squelsh', 1); break;
        case 'propSpawn': this.audio.play('static', 0.6); break;
        case 'propTaken': this.audio.play('crowdPop', 0.9); break;
        case 'propBroke': this.audio.play('rope', 1); this.audio.play('crowdPop', 0.6); break;
        case 'spot':
          // A sting on top of the hit itself, and the room loses its mind.
          this.audio.play(e.kind === 'finisher' ? 'finisher' : 'reversal', 1);
          this.audio.play('crowdPop', 1);
          if (e.kind === 'finisher') this.audio.play('static', 0.55);
          break;
        case 'pinStart': this.audio.play('crowdPop', 0.8); break;
        case 'pinCount': this.audio.play('pinSlap', 1); this.audio.playVO(1); break;
        case 'pinEscape':
          this.audio.play('crowdPop', e.nearFall ? 1 : 0.75);
          if (e.nearFall) this.audio.play('bell', 0.4);
          break;
        case 'fighter':
          switch (e.event.type) {
            case 'move':
              if (e.event.move.kind === 'grapple') this.audio.play('grapple', 0.7);
              break;
            case 'whiff': this.audio.play('whoosh', 0.45); break;
            case 'taunt': this.audio.play('uiSelect', 0.7); this.audio.play('crowdPop', 0.35); break;
            case 'grappleBreak': this.audio.play('rope', 0.6); break;
            case 'rebound': this.audio.play('rope', 0.85); break;
            case 'ropeRun': this.audio.play('whoosh', 0.35); break;
            case 'perch': this.audio.play('crowdPop', 0.75); break;
            case 'landed': if (e.event.hard) this.audio.play('thud', 0.9); break;
            case 'leftRing': this.audio.play('thud', 1); break;
          }
          break;
        case 'phase':
          if (e.phase === 'LIVE') { this.audio.play('bell', 1); this.hud?.flashCue('FIGHT', 900); }
          break;
      }
    }
  }

  /**
   * Names the contextual move the buttons will produce. With around twenty
   * actions living on two buttons, telling the player what is about to happen is
   * what makes the system read as deep rather than random.
   */
  private updateContextLabels(): void {
    const p = this.sim?.p1;
    if (!p) return;
    const foe = this.sim!.p2;
    const dist = p.distanceTo(foe);

    const behind = p.behind(foe);

    if (p.carrying) {
      this.pad.setAttackContext('SWING', p.carrying.name);
    } else if (p.state === FS.PERCH) {
      this.pad.setAttackContext(foe.outside ? 'DIVE OUT' : 'DIVE', 'OFF THE TOP');
    } else if (p.state === FS.ROPE_RUN) {
      this.pad.setAttackContext(foe.outside ? 'DIVE' : 'RUNNING', 'OFF THE ROPES');
    } else if (foe.state === FS.CORNERED && dist < 2) {
      this.pad.setAttackContext('CORNER', 'MOUNT THEM');
    } else if (foe.isDown && dist < 1.8) {
      this.pad.setAttackContext('STOMP', 'GROUND ATTACK');
    } else if (behind && dist < 2) {
      this.pad.setAttackContext('BLINDSIDE', 'THEY CANNOT SEE YOU');
    } else {
      const inCorner = nearestCorner(p.x, p.z).dist <= RING.cornerR && dist > 1.9;
      this.pad.setAttackContext(null, inCorner ? 'GRAB TO CLIMB' : null);
    }

    // GRAB changes meaning too, and the rear grapple is the whole reason
    // turning exists — it has to be visible that it is available.
    if (p.carrying) this.pad.setGrabContext('DROP', null);
    else if (foe.isDown && dist < TUNING.pin.range) {
      const pinnable = foe.healthFrac <= TUNING.pin.maxHealthFrac || foe.exhausted;
      this.pad.setGrabContext(pinnable ? 'PIN' : 'PICK UP', pinnable ? 'COVER THEM' : null);
    } else if (p.state === FS.PERCH) this.pad.setGrabContext('CLIMB DOWN', null);
    else if (p.state === FS.APRON) this.pad.setGrabContext('ROLL IN', null);
    else if (behind && dist < 2.2) this.pad.setGrabContext('REAR GRAPPLE', 'FROM BEHIND');
    else if (nearestCorner(p.x, p.z).dist <= RING.cornerR && dist > 1.9) {
      this.pad.setGrabContext('CLIMB', 'UP TOP');
    } else this.pad.setGrabContext(null, null);
  }

  /**
   * Drops a tier if frames are consistently slow, and only ever drops — hunting
   * up and down mid-match would be more distracting than a lower resolution.
   */
  private autoQuality(dt: number): void {
    if (Save.settings.quality) return;
    this.qualityCooldown -= dt;
    if (this.qualityCooldown > 0) return;
    if (this.frameAvg < 26) return;
    const order: Quality[] = ['HIGH', 'MEDIUM', 'LOW'];
    const i = order.indexOf(this.stage.quality);
    if (i < order.length - 1) {
      this.stage.setQuality(order[i + 1]!);
      this.qualityCooldown = 6000;
      this.frameAvg = 16.7;
    }
  }

  /* ------------------------------------------------------------------ *
   * test hooks
   * ------------------------------------------------------------------ */

  /** Exposed for the smoke test and the headless pacing harness. */
  debug(): Record<string, unknown> {
    return {
      screen: this.screen,
      paused: this.paused,
      quality: this.stage.quality,
      fps: Math.round(1000 / Math.max(1, this.frameAvg)),
      sim: this.sim,
      view: this.view,
      startMatch: () => this.startMatch(),
      showTitle: () => this.showTitle(),
      presets: PRESETS,
      canon: CANON,
      tuning: TUNING,
      neutral: neutralIntent,
    };
  }
}
