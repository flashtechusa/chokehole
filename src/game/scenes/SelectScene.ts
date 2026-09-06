import Phaser from 'phaser';
import type { ArenaConfig, WrestlerConfig } from '@/game/types';
import { C, CSS, FONT } from '@/game/config/palette';
import { TUNING } from '@/game/config/tuning';
import { ROSTER } from '@/game/data/characters';
import { ARENAS } from '@/game/data/arenas';
import { Portrait } from '@/game/render/Portrait';
import { FS } from '@/game/combat/states';
import { crtOverlay, drawPanel, makeButton, slam } from '@/game/ui/Kit';
import { Save } from '@/game/save/SaveManager';
import { Audio } from '@/game/audio/AudioManager';
import { fs, fsn } from '@/game/config/type';

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
      fontFamily: FONT.mono, fontSize: fs(12), color: CSS.acid,
    }).setOrigin(0.5);

    makeButton(this, W - 86, 30, 'BACK', () => this.back(), { w: 132, h: 40, color: C.steel, size: 14 });

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
    const cardTop = 58;
    const spacing = Math.min(540, (W - 60) / n);
    const cardW = Math.min(470, spacing - 22);
    const startX = W / 2 - ((n - 1) * spacing) / 2;
    const pad = 14;

    interface Card {
      x: number; bg2: Phaser.GameObjects.Graphics; accent: number;
      unlocked: boolean; w: WrestlerConfig; natural: number;
    }
    const pending: Card[] = [];

    // Card content is measured top-down. At the readability floor there is no
    // spare vertical room, so nothing here may assume a fixed row height.
    ROSTER.forEach((w, i) => {
      const x = startX + i * spacing;
      const unlocked = Save.isWrestlerUnlocked(w.id);
      const accent = w.alignment === 'HEEL' ? C.pink : C.acid;
      const L = x - cardW / 2 + pad;
      const R = x + cardW / 2 - pad;

      // backing panel is created first (so it sits under everything) and drawn
      // once the measured height is known
      const bg2 = this.add.graphics();
      this.layer.add(bg2);

      let y = cardTop + pad;
      const name = this.add.text(L, y, w.displayName, {
        fontFamily: FONT.slam, fontSize: fs(24), color: CSS.white,
      });
      const arch = this.add.text(R, y + 4, w.archetype, {
        fontFamily: FONT.slam, fontSize: fs(12), color: CSS.cyan,
      }).setOrigin(1, 0);
      y += name.height + 1;
      const tag = this.add.text(L, y, w.tagline, {
        fontFamily: FONT.mono, fontSize: fs(9), color: CSS.gold,
        wordWrap: { width: cardW - pad * 2 },
      });
      y += tag.height + 10;
      this.layer.add([name, arch, tag]);

      // right column: stat bars, then the fictional move set
      const statColW = Math.min(300, cardW * 0.62);
      const statX = R - statColW;
      const labelW = 96;
      const barW = statColW - labelW;
      const pitch = fsn(9) + 7;
      const stats: [string, number][] = [
        ['POWER', w.stats.power / 1.4],
        ['SPEED', (w.stats.speed - 130) / 70],
        ['GRAPPLE', w.stats.grapple / 1.5],
        ['REVERSAL', w.stats.reversal / 1.4],
        ['SQUELSH', w.stats.squelshGain / 1.4],
      ];
      const sg = this.add.graphics();
      stats.forEach(([label, v], si) => {
        const sy = y + si * pitch;
        const t = this.add.text(statX, sy, label!, {
          fontFamily: FONT.mono, fontSize: fs(9), color: CSS.bone,
        }).setAlpha(0.8);
        this.layer.add(t);
        const by = sy + fsn(9) / 2 - 4;
        sg.fillStyle(0x2a1b30, 1);
        sg.fillRect(statX + labelW, by, barW, 9);
        sg.fillStyle(si % 2 ? C.acid : C.pink, 1);
        sg.fillRect(statX + labelW, by, barW * Phaser.Math.Clamp(v!, 0.08, 1), 9);
      });
      this.layer.add(sg);

      const movesY = y + stats.length * pitch + 8;
      const moves = this.add.text(statX, movesY,
        `SIG   ${w.moves.signature.name}\nFIN   ${w.moves.finisher.name}\nPROP  ${w.prop?.name ?? '--'}`, {
        fontFamily: FONT.mono, fontSize: fs(9), color: CSS.white,
        lineSpacing: 5, wordWrap: { width: statColW },
      }).setAlpha(0.9);
      this.layer.add(moves);

      // The full real-persona summary and its sourcing live on the ROSTER
      // screen, where there is room to print them at a readable size.
      const footY = Math.max(movesY + moves.height + 10, y + 210);
      const foot = this.add.text(L, footY, `SOURCING · ${w.personaResearch}`, {
        fontFamily: FONT.mono, fontSize: fs(8), color: CSS.white,
        wordWrap: { width: cardW - pad * 2 },
      }).setAlpha(0.55);
      this.layer.add(foot);

      // panels and SELECT buttons are drawn after the loop, at a height common
      // to every card, so a longer move name cannot stagger the button row
      pending.push({
        x, bg2, accent, unlocked, w,
        natural: footY + foot.height + pad - cardTop,
      });

      // live rig, standing in the left column, scaled to whatever room is left
      const rigTop = y;
      const rigBottom = footY - 8;
      const rigScale = Phaser.Math.Clamp((rigBottom - rigTop) / 250, 0.55, 0.9);
      const p = new Portrait(this, w, L + (statX - 12 - L) / 2, rigBottom, rigScale, 1);
      p.setPose(FS.IDLE);
      this.portraits.push(p);
      this.layer.add(p.root);

    });

    // The SELECT row has to clear the BACK button at the bottom of the screen,
    // so the cards are capped rather than allowed to push it off-screen.
    const btnH = 52;
    const maxCardH = 528 - cardTop - 26 - btnH;
    const cardH = Math.min(Math.max(...pending.map((c) => c.natural)), maxCardH);
    for (const c of pending) {
      drawPanel(c.bg2, c.x - cardW / 2, cardTop, cardW, cardH, c.accent, c.unlocked ? 0.13 : 0.04);
      const btn = makeButton(this, c.x, cardTop + cardH + 26 + btnH / 2,
        c.unlocked ? 'SELECT' : 'LOCKED', () => {
          if (!c.unlocked) return;
          Audio.play('crowdPop', 0.5);
          onPick(c.w);
        }, {
          w: cardW - 20, h: btnH, size: 20,
          color: c.unlocked ? c.accent : C.steel,
          sub: c.unlocked ? c.w.quotes.entrance : c.w.unlock.label,
          disabled: !c.unlocked,
        });
      this.layer.add(btn.container);
    }
  }

  /* ---------------------------------------------------------------- */

  private buildArena(): void {
    const unlockedArenas = ARENAS.filter((a) => Save.isArenaUnlocked(a.id));
    const list = unlockedArenas.length > 0 ? unlockedArenas : [ARENAS[0]!];
    if (!list.some((a) => a.id === this.arenaId)) this.arenaId = list[0]!.id;

    const cardTop = 46;
    const spacing = Math.min(400, (W - 80) / Math.max(1, list.length));
    const cardW = Math.min(372, spacing - 20);
    const startX = W / 2 - ((list.length - 1) * spacing) / 2;
    const pad = 10;
    let cardBottom = cardTop;

    list.forEach((a, i) => {
      const x = startX + i * spacing;
      const bg2 = this.add.graphics();
      this.layer.add(bg2);

      // arena thumbnail: a miniature of the room itself
      const th = this.add.graphics();
      const tx = x - cardW / 2 + pad;
      const ty = cardTop + pad;
      const tw = cardW - pad * 2;
      const thh = 68;
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

      let cy = ty + thh + 8;
      const nm = this.add.text(x, cy, a.displayName, {
        fontFamily: FONT.slam, fontSize: fs(14), color: CSS.white,
        align: 'center', wordWrap: { width: tw },
      }).setOrigin(0.5, 0);
      cy += nm.height + 3;
      const city = this.add.text(x, cy, `${a.city} · ${a.history.date}`, {
        fontFamily: FONT.mono, fontSize: fs(9), color: CSS.gold,
      }).setOrigin(0.5, 0);
      cy += city.height + 10;
      this.layer.add([nm, city]);

      const btnH = 38;
      const btn = makeButton(this, x, cy + btnH / 2, this.arenaId === a.id ? 'SELECTED' : 'CHOOSE', () => {
        this.arenaId = a.id;
        showDetail(a);
        this.buildArenaButtons();
      }, { w: tw, h: btnH, size: 15, color: this.arenaId === a.id ? C.acid : C.gold });
      this.layer.add(btn.container);

      const cardH = cy + btnH + pad - cardTop;
      drawPanel(bg2, x - cardW / 2, cardTop, cardW, cardH, C.gold, 0.1);
      cardBottom = Math.max(cardBottom, cardTop + cardH);
    });

    // locked arenas teaser, then the real-history readout, stacked under the cards
    let y = cardBottom + 12;
    const locked = ARENAS.filter((a) => !Save.isArenaUnlocked(a.id));
    if (locked.length > 0) {
      const t = this.add.text(W / 2, y,
        `LOCKED: ${locked.map((a) => `${a.displayName} (${a.unlock.label})`).join('  ·  ')}`, {
        fontFamily: FONT.mono, fontSize: fs(9), color: CSS.gold,
        align: 'center', wordWrap: { width: W - 120 },
      }).setOrigin(0.5, 0).setAlpha(0.6);
      this.layer.add(t);
      y += t.height + 10;
    }

    const detail = this.add.text(W / 2, y, '', {
      fontFamily: FONT.mono, fontSize: fs(9), color: CSS.bone,
      align: 'center', wordWrap: { width: W - 140 }, lineSpacing: 3,
    }).setOrigin(0.5, 0);
    this.layer.add(detail);

    const showDetail = (a: ArenaConfig): void => {
      detail.setText(
        `REAL HISTORY — ${a.history.eventName}\n` +
        `${a.history.venue} · ${a.history.city} · ${a.history.date}  [${a.history.research}]\n` +
        `${a.history.note}\n` +
        `ARENA EVENT — ${a.event.label}: ${a.event.description}`,
      );
    };

    const current = list.find((a) => a.id === this.arenaId) ?? list[0]!;
    showDetail(current);
    this.buildArenaButtons();
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
      const b = makeButton(this, 244 + i * 136, 500, labels[d], () => {
        this.difficulty = d;
        Save.updateSettings({ difficulty: d });
        this.buildArenaButtons();
      }, {
        w: 124, h: 40, size: 13,
        color: this.difficulty === d ? C.acid : C.steel,
      });
      c.add(b.container);
    });

    const fight = makeButton(this, W - 150, 500, 'FIGHT', () => this.startMatch(), {
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
