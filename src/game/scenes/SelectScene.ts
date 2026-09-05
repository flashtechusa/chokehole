import Phaser from 'phaser';
import type { ArenaConfig, WrestlerConfig } from '@/game/types';
import { C, CSS, FONT } from '@/game/config/palette';
import { TUNING } from '@/game/config/tuning';
import { ROSTER } from '@/game/data/characters';
import { ARENAS } from '@/game/data/arenas';
import { Portrait } from '@/game/render/Portrait';
import { FS } from '@/game/combat/states';
import { crtOverlay, makeButton, panel, slam } from '@/game/ui/Kit';
import { Save } from '@/game/save/SaveManager';
import { Audio } from '@/game/audio/AudioManager';

const W = TUNING.view.width;
const H = TUNING.view.height;

type Step = 'PLAYER' | 'OPPONENT' | 'ARENA';

/**
 * Character select as a corrupted broadcast crossed with wrestling trading
 * cards (Design Bible section 17). Portraits are live rigs, not stills.
 */
export class SelectScene extends Phaser.Scene {
  private step: Step = 'PLAYER';
  private playerId = 'jassy';
  private opponentId = 'raid';
  private arenaId = 'nola-warehouse-2018';
  private difficulty: 'EASY' | 'NORMAL' | 'BRUTAL' = 'NORMAL';

  private portraits: Portrait[] = [];
  private layer!: Phaser.GameObjects.Container;
  private header!: Phaser.GameObjects.Text;

  constructor() { super('Select'); }

  create(): void {
    this.difficulty = Save.settings.difficulty;
    this.cameras.main.setBackgroundColor('#0d0614');
    const bg = this.add.graphics();
    bg.fillStyle(0x14081c, 1);
    bg.fillRect(0, 0, W, H);
    for (let i = 0; i < 22; i++) {
      bg.fillStyle(i % 2 ? C.pink : C.purple, 0.045);
      bg.fillRect(0, i * 26, W, 13);
    }

    slam(this, 128, 30, 'SELECT', 30, CSS.pink, -4);
    this.header = this.add.text(W / 2, 24, '', {
      fontFamily: FONT.mono, fontSize: '12px', color: CSS.acid,
    }).setOrigin(0.5);

    makeButton(this, 62, 502, 'BACK', () => this.back(), { w: 104, h: 40, color: C.steel, size: 15 });

    this.layer = this.add.container(0, 0);
    crtOverlay(this);
    this.buildStep();
    this.cameras.main.fadeIn(200, 0, 0, 0);
  }

  private back(): void {
    if (this.step === 'ARENA') { this.step = 'OPPONENT'; this.buildStep(); return; }
    if (this.step === 'OPPONENT') { this.step = 'PLAYER'; this.buildStep(); return; }
    this.scene.start('Menu');
  }

  private clearStep(): void {
    for (const p of this.portraits) p.destroy();
    this.portraits = [];
    this.layer.removeAll(true);
  }

  private buildStep(): void {
    this.clearStep();
    if (this.step === 'PLAYER') {
      this.header.setText('STEP 1 / 3 — CHOOSE YOUR WRESTLER');
      this.buildRoster((w) => {
        this.playerId = w.id;
        this.opponentId = ROSTER.find((r) => r.id !== w.id)?.id ?? w.id;
        this.step = 'OPPONENT';
        this.buildStep();
      });
    } else if (this.step === 'OPPONENT') {
      this.header.setText('STEP 2 / 3 — CHOOSE YOUR OPPONENT');
      this.buildRoster((w) => {
        this.opponentId = w.id;
        this.step = 'ARENA';
        this.buildStep();
      });
    } else {
      this.header.setText('STEP 3 / 3 — CHOOSE THE VENUE');
      this.buildArena();
    }
  }

  /* ---------------------------------------------------------------- */

  private buildRoster(onPick: (w: WrestlerConfig) => void): void {
    const n = ROSTER.length;
    const cardW = 322;
    const cardTop = 62;
    const cardH = 372;
    const spacing = Math.min(370, (W - 90) / n);
    const startX = W / 2 - ((n - 1) * spacing) / 2;

    ROSTER.forEach((w, i) => {
      const x = startX + i * spacing;
      const unlocked = Save.isWrestlerUnlocked(w.id);
      const accent = w.alignment === 'HEEL' ? C.pink : C.acid;
      this.layer.add(panel(this, x - cardW / 2, cardTop, cardW, cardH, accent, unlocked ? 0.13 : 0.04));

      const L = x - cardW / 2 + 16;
      const R = x + cardW / 2 - 16;

      const name = this.add.text(L, cardTop + 10, w.displayName, {
        fontFamily: FONT.slam, fontSize: '31px', color: CSS.white,
      });
      const tag = this.add.text(L, cardTop + 44, w.tagline, {
        fontFamily: FONT.mono, fontSize: '10px', color: CSS.gold,
      });
      const arch = this.add.text(R, cardTop + 12, w.archetype, {
        fontFamily: FONT.slam, fontSize: '14px', color: CSS.cyan,
      }).setOrigin(1, 0);
      this.layer.add([name, tag, arch]);

      // live rig, standing on the left half of the card
      const p = new Portrait(this, w, L + 70, cardTop + 262, 0.86, 1);
      p.setPose(FS.IDLE);
      this.portraits.push(p);
      this.layer.add(p.root);

      // stat bars, right half
      const stats: [string, number][] = [
        ['POWER', w.stats.power / 1.4],
        ['SPEED', (w.stats.speed - 130) / 70],
        ['GRAPPLE', w.stats.grapple / 1.5],
        ['REVERSAL', w.stats.reversal / 1.4],
        ['SQUELSH', w.stats.squelshGain / 1.4],
      ];
      const sg = this.add.graphics();
      const statX = x + 6;
      stats.forEach(([label, v], si) => {
        const sy = cardTop + 74 + si * 21;
        const t = this.add.text(statX, sy - 5, label!, {
          fontFamily: FONT.mono, fontSize: '9px', color: CSS.bone,
        }).setAlpha(0.8);
        this.layer.add(t);
        sg.fillStyle(0x2a1b30, 1);
        sg.fillRect(statX + 60, sy - 4, 82, 9);
        sg.fillStyle(si % 2 ? C.acid : C.pink, 1);
        sg.fillRect(statX + 60, sy - 4, 82 * Phaser.Math.Clamp(v!, 0.08, 1), 9);
      });
      this.layer.add(sg);

      const moves = this.add.text(statX, cardTop + 190,
        `SIG   ${w.moves.signature.name}\nFIN   ${w.moves.finisher.name}\nPROP  ${w.prop?.name ?? '--'}`, {
        fontFamily: FONT.mono, fontSize: '9px', color: CSS.white,
        lineSpacing: 5, wordWrap: { width: 148 },
      }).setAlpha(0.9);
      this.layer.add(moves);

      // real-persona blurb runs the full width under the figure
      const persona = this.add.text(L, cardTop + 274, `REAL PERSONA — ${w.publicPersonaSummary}`, {
        fontFamily: FONT.mono, fontSize: '8px', color: CSS.white,
        wordWrap: { width: cardW - 32 }, lineSpacing: 2,
      }).setAlpha(0.55);
      this.layer.add(persona);

      const btn = makeButton(this, x, cardTop + cardH + 32, unlocked ? 'SELECT' : 'LOCKED', () => {
        if (!unlocked) return;
        Audio.play('crowdPop', 0.5);
        onPick(w);
      }, {
        w: cardW - 26, h: 46, size: 20,
        color: unlocked ? accent : C.steel,
        sub: unlocked ? w.quotes.entrance : w.unlock.label,
        disabled: !unlocked,
      });
      this.layer.add(btn.container);
    });
  }

  /* ---------------------------------------------------------------- */

  private buildArena(): void {
    const unlockedArenas = ARENAS.filter((a) => Save.isArenaUnlocked(a.id));
    const list = unlockedArenas.length > 0 ? unlockedArenas : [ARENAS[0]!];
    if (!list.some((a) => a.id === this.arenaId)) this.arenaId = list[0]!.id;

    const cardW = 268;
    const spacing = Math.min(292, (W - 100) / Math.max(1, list.length));
    const startX = W / 2 - ((list.length - 1) * spacing) / 2;

    const detail = this.add.text(W / 2, 348, '', {
      fontFamily: FONT.mono, fontSize: '10px', color: CSS.bone,
      align: 'center', wordWrap: { width: 620 }, lineSpacing: 3,
    }).setOrigin(0.5, 0);
    this.layer.add(detail);

    const showDetail = (a: ArenaConfig): void => {
      detail.setText(
        `REAL HISTORY — ${a.history.eventName}\n` +
        `${a.history.venue} · ${a.history.city} · ${a.history.date}  [${a.history.research}]\n` +
        `${a.history.note}\n\n` +
        `ARENA EVENT — ${a.event.label}: ${a.event.description}`,
      );
    };

    list.forEach((a, i) => {
      const x = startX + i * spacing;
      const y = 210;
      const g = panel(this, x - cardW / 2, y - 108, cardW, 216, C.gold, 0.1);
      this.layer.add(g);

      // arena thumbnail: a miniature of the room itself
      const th = this.add.graphics();
      const tx = x - cardW / 2 + 12;
      const ty = y - 96;
      const tw = cardW - 24;
      const thh = 74;
      for (let k = 0; k < 8; k++) {
        const col = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(a.palette.skyTop),
          Phaser.Display.Color.ValueToColor(a.palette.skyBottom),
          100, (k / 7) * 100,
        );
        th.fillStyle(Phaser.Display.Color.GetColor(col.r, col.g, col.b), 1);
        th.fillRect(tx, ty + (thh / 8) * k, tw, thh / 8 + 1);
      }
      th.fillStyle(a.palette.lightWarm, 0.18);
      th.fillRect(tx + tw * 0.2, ty, tw * 0.18, thh);
      th.fillStyle(a.palette.lightCool, 0.16);
      th.fillRect(tx + tw * 0.62, ty, tw * 0.16, thh);
      th.fillStyle(a.palette.crowd, 1);
      for (let k = 0; k < 16; k++) {
        const cx2 = tx + 6 + (tw - 12) * (k / 15);
        th.fillCircle(cx2, ty + thh - 30 + (k % 3) * 2, 4.5);
        th.fillRect(cx2 - 4.5, ty + thh - 27 + (k % 3) * 2, 9, 12);
      }
      th.fillStyle(a.palette.matCanvas, 1);
      th.fillPoints([
        new Phaser.Geom.Point(tx + tw * 0.2, ty + thh - 22),
        new Phaser.Geom.Point(tx + tw * 0.8, ty + thh - 22),
        new Phaser.Geom.Point(tx + tw * 0.92, ty + thh),
        new Phaser.Geom.Point(tx + tw * 0.08, ty + thh),
      ], true, true);
      for (let k = 0; k < 3; k++) {
        th.lineStyle(1.6, a.palette.ropes[k] ?? a.palette.ropes[0], 0.9);
        th.lineBetween(tx + tw * 0.08, ty + thh - 4 - k * 6, tx + tw * 0.92, ty + thh - 4 - k * 6);
      }
      th.fillStyle(a.palette.posts, 1);
      th.fillRect(tx + tw * 0.07, ty + thh - 20, 3, 20);
      th.fillRect(tx + tw * 0.92, ty + thh - 20, 3, 20);
      th.lineStyle(2, C.gold, 0.7);
      th.strokeRect(tx, ty, tw, thh);
      this.layer.add(th);

      const nm = this.add.text(x, y - 6, a.displayName, {
        fontFamily: FONT.slam, fontSize: '17px', color: CSS.white,
        align: 'center', wordWrap: { width: cardW - 30 },
      }).setOrigin(0.5, 0);
      const city = this.add.text(x, y + 34, `${a.city} · ${a.history.date}`, {
        fontFamily: FONT.mono, fontSize: '9px', color: CSS.gold,
      }).setOrigin(0.5, 0);
      this.layer.add([nm, city]);

      const btn = makeButton(this, x, y + 78, this.arenaId === a.id ? 'SELECTED' : 'CHOOSE', () => {
        this.arenaId = a.id;
        showDetail(a);
        this.buildArenaButtons();
      }, { w: cardW - 40, h: 40, size: 16, color: this.arenaId === a.id ? C.acid : C.gold });
      this.layer.add(btn.container);
    });

    const current = list.find((a) => a.id === this.arenaId) ?? list[0]!;
    showDetail(current);

    this.buildArenaButtons();

    // locked arenas teaser
    const locked = ARENAS.filter((a) => !Save.isArenaUnlocked(a.id));
    if (locked.length > 0) {
      const t = this.add.text(W / 2, 328,
        `LOCKED: ${locked.map((a) => `${a.displayName} (${a.unlock.label})`).join('  ·  ')}`, {
        fontFamily: FONT.mono, fontSize: '9px', color: CSS.gold,
      }).setOrigin(0.5).setAlpha(0.6);
      this.layer.add(t);
    }
  }

  private arenaButtons: Phaser.GameObjects.Container | null = null;

  private buildArenaButtons(): void {
    this.arenaButtons?.destroy(true);
    const c = this.add.container(0, 0);
    this.arenaButtons = c;
    this.layer.add(c);

    const diffs: ('EASY' | 'NORMAL' | 'BRUTAL')[] = ['EASY', 'NORMAL', 'BRUTAL'];
    const labels = { EASY: 'ROOKIE', NORMAL: 'CARD MATCH', BRUTAL: 'MAIN EVENT' };
    diffs.forEach((d, i) => {
      const b = makeButton(this, W / 2 - 246 + i * 128, 486, labels[d], () => {
        this.difficulty = d;
        Save.updateSettings({ difficulty: d });
        this.buildArenaButtons();
      }, {
        w: 120, h: 38, size: 13,
        color: this.difficulty === d ? C.acid : C.steel,
      });
      c.add(b.container);
    });

    const fight = makeButton(this, W - 150, 486, 'FIGHT', () => this.startMatch(), {
      w: 200, h: 50, size: 26, color: C.blood, sub: 'BELL TIME',
    });
    c.add(fight.container);
  }

  private startMatch(): void {
    Audio.play('bell', 0.8);
    this.cameras.main.fadeOut(240, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Match', {
        playerId: this.playerId,
        opponentId: this.opponentId,
        arenaId: this.arenaId,
        difficulty: this.difficulty,
      });
    });
  }

  override update(_t: number, dt: number): void {
    for (const p of this.portraits) p.update(dt);
  }
}
