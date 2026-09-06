import Phaser from 'phaser';
import { C, CSS, FONT } from '@/game/config/palette';
import { TUNING } from '@/game/config/tuning';
import { getWrestler } from '@/game/data/characters';
import { getArena, ARENAS } from '@/game/data/arenas';
import { Portrait } from '@/game/render/Portrait';
import { FS } from '@/game/combat/states';
import { crtOverlay, makeButton, panel, slam } from '@/game/ui/Kit';
import { Save } from '@/game/save/SaveManager';
import { Audio } from '@/game/audio/AudioManager';
import { formatClock, pick } from '@/game/utils/math';
import type { MatchResult } from './MatchScene';
import { BRANDING } from '@/game/config/branding';
import { fs, fsn } from '@/game/config/type';

const W = TUNING.view.width;
const H = TUNING.view.height;

/** Post-match broadcast card: winner, method, SQUELSH rating, crowd peak. */
export class ResultsScene extends Phaser.Scene {
  private result!: MatchResult;
  private portraits: Portrait[] = [];

  constructor() { super('Results'); }

  init(data: MatchResult): void { this.result = data; }

  create(): void {
    const r = this.result;
    const winner = r.winnerId ? getWrestler(r.winnerId) : null;
    const loser = r.loserId ? getWrestler(r.loserId) : null;
    const arena = getArena(r.arenaId);

    this.cameras.main.setBackgroundColor('#0a0410');
    const bg = this.add.graphics();
    bg.fillStyle(0x1b0a24, 1);
    bg.fillRect(0, 0, W, H);
    for (let i = 0; i < 14; i++) {
      bg.fillStyle(i % 2 ? C.gold : C.pink, 0.05);
      bg.fillRect(0, i * 40, W, 20);
    }

    const headline = r.method === 'DRAW'
      ? 'TIME LIMIT DRAW'
      : r.playerWon ? 'WINNER' : 'DEFEAT';
    slam(this, W / 2, 52, headline, 50, r.playerWon ? CSS.acid : CSS.pink, -3);

    if (winner) {
      this.add.text(W / 2, 96, winner.displayName, {
        fontFamily: FONT.slam, fontSize: fs(34), color: CSS.white,
      }).setOrigin(0.5);
      this.add.text(W / 2, 128, `“${pick(winner.quotes.win)}”`, {
        fontFamily: FONT.mono, fontSize: fs(11), color: CSS.gold,
      }).setOrigin(0.5).setAlpha(0.85);

      const wp = new Portrait(this, winner, 158, 402, 1.4, 1);
      wp.setPose(FS.WIN);
      this.portraits.push(wp);
    }
    if (loser) {
      const lp = new Portrait(this, loser, W - 148, 408, 1.15, -1);
      lp.setPose(FS.LOSE);
      lp.root.setAlpha(0.55);
      this.portraits.push(lp);
    }

    // --- stat card ---
    panel(this, W / 2 - 190, 158, 380, 7 * (fsn(13) + 6) + 26, C.gold, 0.1);
    const methodLabel = { PIN: 'PINFALL', KO: 'KNOCKOUT', TIME: 'TIME LIMIT', DRAW: 'DRAW' }[r.method];
    const rows: [string, string][] = [
      ['METHOD', methodLabel],
      ['MATCH TIME', formatClock(r.durationMs)],
      ['CROWD HEAT PEAK', `${Math.round(r.heatPeak)}%`],
      ['BEST COMBO', `${r.bestCombo} HITS`],
      ['REVERSALS', `${r.reversals}`],
      ['FINISHER LANDED', r.finisherHit ? 'YES' : 'NO'],
      ['VENUE', arena.displayName],
    ];
    // row pitch tracks the larger of the two type sizes so the readability
    // floor cannot squeeze the key and value into each other
    const rowPitch = fsn(13) + 6;
    rows.forEach(([k, val], i) => {
      const y = 174 + i * rowPitch;
      this.add.text(W / 2 - 172, y, k, {
        fontFamily: FONT.mono, fontSize: fs(10), color: CSS.bone,
      }).setAlpha(0.7);
      this.add.text(W / 2 + 172, y, val, {
        fontFamily: FONT.slam, fontSize: fs(13), color: CSS.white,
      }).setOrigin(1, 0);
    });

    // --- SQUELSH rating ---
    this.add.text(W / 2, 380, `${BRANDING.sponsor} RATING`, {
      fontFamily: FONT.mono, fontSize: fs(10), color: CSS.acid,
    }).setOrigin(0.5);
    const stars = this.add.graphics();
    for (let i = 0; i < 5; i++) {
      const x = W / 2 - 92 + i * 46;
      const filled = i < r.rating;
      stars.fillStyle(filled ? C.gold : 0x3a2b1a, 1);
      this.drawStar(stars, x, 410, 16);
      if (filled) {
        this.tweens.addCounter({
          from: 0, to: 1, duration: 220, delay: 260 + i * 130,
          onComplete: () => Audio.play('uiSelect', 0.4),
        });
      }
    }

    // --- unlocks ---
    const unlocked = this.processUnlocks();
    if (unlocked.length > 0) {
      const t = this.add.text(W / 2, 440, `NEW ARENA UNLOCKED — ${unlocked.join(', ')}`, {
        fontFamily: FONT.slam, fontSize: fs(16), color: CSS.gold,
      }).setOrigin(0.5);
      this.tweens.add({ targets: t, alpha: 0.4, duration: 500, yoyo: true, repeat: -1 });
      Audio.play('crowdPop', 0.7);
    }

    // --- buttons ---
    makeButton(this, W * 0.18, 486, 'REMATCH', () => {
      this.scene.start('Match', {
        playerId: r.playerId, opponentId: r.opponentId,
        arenaId: r.arenaId, difficulty: r.difficulty,
      });
    }, { w: 208, h: 48, color: C.blood, size: 21, sub: 'RUN IT BACK' });

    makeButton(this, W * 0.41, 486, 'CHANGE FIGHTER', () => this.scene.start('Select'),
      { w: 208, h: 48, color: C.pink, size: 17 });

    makeButton(this, W * 0.645, 486, 'ARCHIVES', () => this.scene.start('Archive'),
      { w: 190, h: 48, color: C.gold, size: 17, sub: 'NEXT STOP' });

    makeButton(this, W * 0.862, 486, 'HOME', () => this.scene.start('Menu'),
      { w: 172, h: 48, color: C.steel, size: 17 });

    crtOverlay(this);
    this.cameras.main.fadeIn(260, 0, 0, 0);
    Audio.play('bell', 0.5);
  }

  private drawStar(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const rad = i % 2 === 0 ? r : r * 0.44;
      pts.push(new Phaser.Geom.Point(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad));
    }
    g.fillPoints(pts, true, true);
  }

  /** Data-driven arena unlocks. */
  private processUnlocks(): string[] {
    const save = Save.get();
    const newly: string[] = [];
    for (const a of ARENAS) {
      if (Save.isArenaUnlocked(a.id)) continue;
      const rule = a.unlock;
      let ok = false;
      if (rule.kind === 'default') ok = true;
      else if (rule.kind === 'winsWith') ok = save.totalWins >= Number(rule.value ?? 1);
      else if (rule.kind === 'venue') ok = save.tourCompleted.includes(String(rule.value));
      if (ok && Save.unlockArena(a.id)) newly.push(a.displayName);
    }
    return newly;
  }

  override update(_t: number, dt: number): void {
    for (const p of this.portraits) p.update(dt);
  }
}
