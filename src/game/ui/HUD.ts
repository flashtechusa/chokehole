import Phaser from 'phaser';
import { C, FONT } from '@/game/config/palette';
import { BRANDING, BROADCAST_LINES } from '@/game/config/branding';
import { TUNING } from '@/game/config/tuning';
import type { Fighter } from '@/game/combat/Fighter';
import { formatClock, pick } from '@/game/utils/math';
import { fs, fsn } from '@/game/config/type';
import { readSafeArea } from '@/game/utils/safeArea';

const W = TUNING.view.width;
/** Broadcast lower-third band, measured up from the bottom of the design box. */
const LOWER_Y = TUNING.view.height - 104;

export interface HudOptions {
  highContrast: boolean;
  largeText: boolean;
  subtitles: boolean;
}

/**
 * The broadcast HUD: health, SQUELSH, crowd HEAT, the IBS bug, a fictional
 * viewer count and lower-third callouts. Everything sits on the UI camera so
 * match-camera zoom never moves it.
 */
export class HUD {
  readonly root: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;
  private g: Phaser.GameObjects.Graphics;
  private slab: Phaser.GameObjects.Graphics;
  private nameL: Phaser.GameObjects.Text;
  private nameR: Phaser.GameObjects.Text;
  private tagL: Phaser.GameObjects.Text;
  private tagR: Phaser.GameObjects.Text;
  private clock: Phaser.GameObjects.Text;
  private liveBug: Phaser.GameObjects.Text;
  private viewers: Phaser.GameObjects.Text;
  private heatLabel: Phaser.GameObjects.Text;
  private lowerThird: Phaser.GameObjects.Text;
  private subtitle: Phaser.GameObjects.Text;
  private comboL: Phaser.GameObjects.Text;
  private comboR: Phaser.GameObjects.Text;
  private ticker: Phaser.GameObjects.Text;

  private opts: HudOptions;
  /**
   * Vertical rhythm for the top-left/right fighter blocks and the centre
   * broadcast stack. Recomputed from the type scale rather than hand-tuned, so
   * raising font sizes cannot silently overlap them again.
   */
  private get rows(): {
    name: number; tag: number; bar: number; barH: number; squelsh: number;
    bug: number; clock: number; viewers: number; heatLabel: number;
    heatBar: number; ticker: number; lower: number; sub: number;
  } {
    const big = this.opts.largeText;
    const nameH = fsn(big ? 22 : 18);
    const tagH = fsn(big ? 11 : 9);
    const barH = big ? 20 : 17;
    const bar = nameH + tagH + 12;
    const squelsh = bar + barH + 5;
    const clockH = fsn(big ? 30 : 26);
    const bugH = fsn(10);
    const smallH = fsn(9);
    const clock = bugH + 4;
    const viewers = clock + clockH + 4;
    const heatLabel = viewers + smallH + 6;
    const heatBar = heatLabel + smallH + 3;
    const ticker = heatBar + 12;
    return {
      name: 0, tag: nameH + 2, bar, barH, squelsh,
      bug: 0, clock, viewers, heatLabel, heatBar, ticker,
      // The lower third is anchored to the bottom of the screen, not to the top
      // stack: at readable type the top stack reaches the ring, and the centre
      // bottom is the only clear band between the two thumb clusters.
      lower: LOWER_Y - (this.topInset + 8),
      sub: LOWER_Y - (this.topInset + 8) + fsn(big ? 20 : 17) + 8,
    };
  }
  private viewerCount = 4_820_119;
  private tickerT = 0;
  private lowerT = 0;
  private subT = 0;
  private topInset = 0;

  constructor(scene: Phaser.Scene, left: Fighter, right: Fighter, opts: HudOptions) {
    this.scene = scene;
    this.opts = opts;
    this.root = scene.add.container(0, 0).setDepth(800).setScrollFactor(0);
    this.g = scene.add.graphics();
    this.slab = scene.add.graphics();
    this.root.add([this.slab, this.g]);

    const big = opts.largeText;
    const nameSize = big ? fs(22) : fs(18);
    const tagSize = big ? fs(11) : fs(9);

    this.nameL = this.mk(left.cfg.displayName, 0, 0, nameSize, '#ffffff', 0);
    this.nameR = this.mk(right.cfg.displayName, 0, 0, nameSize, '#ffffff', 1);
    this.tagL = this.mk(left.cfg.tagline, 0, 0, tagSize, '#f3e9dd', 0, true).setAlpha(0.7);
    this.tagR = this.mk(right.cfg.tagline, 0, 0, tagSize, '#f3e9dd', 1, true).setAlpha(0.7);

    this.clock = this.mk('5:00', W / 2, 0, big ? fs(30) : fs(26), '#ffffff', 0.5);
    this.liveBug = this.mk(`● ${BRANDING.network} ${BRANDING.liveBug}`, W / 2, 0, fs(10), '#ff2d95', 0.5, true);
    this.viewers = this.mk('', W / 2, 0, fs(9), '#b6ff3a', 0.5, true);
    this.heatLabel = this.mk('CROWD HEAT', W / 2, 0, fs(9), '#ffd23f', 0.5, true);

    this.lowerThird = this.mk('', W / 2, 0, big ? fs(20) : fs(17), '#ffffff', 0.5).setAlpha(0);
    this.subtitle = this.mk('', W / 2, 0, big ? fs(15) : fs(12), '#f3e9dd', 0.5, true).setAlpha(0);
    this.comboL = this.mk('', 0, 0, big ? fs(22) : fs(19), '#b6ff3a', 0).setAlpha(0);
    this.comboR = this.mk('', 0, 0, big ? fs(22) : fs(19), '#b6ff3a', 1).setAlpha(0);
    this.ticker = this.mk('', W / 2, 0, fs(9), '#f3e9dd', 0.5).setAlpha(0.55);

    this.layout();
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });
  }

  /** Text is created after the slab, so it always draws on top of it. */
  private mk(
    text: string, x: number, y: number, size: string, color: string, originX: number,
    mono = false,
  ): Phaser.GameObjects.Text {
    const t = this.scene.add.text(x, y, text, {
      // was inferred from font size, which broke once every size cleared the
      // readability floor; the broadcast fine print is mono by intent
      fontFamily: mono ? FONT.mono : FONT.slam,
      fontSize: size,
      color,
      stroke: '#120a1a',
      strokeThickness: 3,
    }).setOrigin(originX, 0);
    this.root.add(t);
    return t;
  }

  private layout(): void {
    const s = this.scene.scale.displayScale.x || 1;
    const inset = readSafeArea();
    this.topInset = inset.top * s;
    const left = inset.left * s;
    const right = inset.right * s;
    const y = this.topInset + 8;
    const r = this.rows;

    this.nameL.setPosition(left + 22, y + r.name);
    this.tagL.setPosition(left + 22, y + r.tag);
    this.nameR.setPosition(W - right - 22, y + r.name);
    this.tagR.setPosition(W - right - 22, y + r.tag);
    this.liveBug.setPosition(W / 2, y + r.bug);
    this.clock.setPosition(W / 2, y + r.clock);
    this.viewers.setPosition(W / 2, y + r.viewers);
    this.heatLabel.setPosition(W / 2, y + r.heatLabel);
    this.ticker.setPosition(W / 2, y + r.ticker);
    this.lowerThird.setPosition(W / 2, y + r.lower);
    this.subtitle.setPosition(W / 2, y + r.sub);
  }

  /* ---------------------------------------------------------------- */

  showCallout(text: string, sub?: string): void {
    this.lowerThird.setText(text).setAlpha(1);
    this.lowerT = 1900;
    if (sub && this.opts.subtitles) {
      this.subtitle.setText(`“${sub}”`).setAlpha(1);
      this.subT = 2200;
    }
  }

  bumpViewers(amount: number): void {
    this.viewerCount += Math.floor(amount);
  }

  update(
    dtMs: number, left: Fighter, right: Fighter, heat01: number,
    timeLeftMs: number, corrupt: number,
  ): void {
    const s = this.scene.scale.displayScale.x || 1;
    const inset = readSafeArea();
    const padL = inset.left * s + 22;
    const padR = inset.right * s + 22;
    const y = this.topInset + 8;
    const r = this.rows;

    this.clock.setText(formatClock(timeLeftMs));
    this.viewerCount += dtMs * 0.06 * (0.3 + heat01 * 3);
    this.viewers.setText(`${Math.floor(this.viewerCount).toLocaleString()} WATCHING`);

    this.tickerT -= dtMs;
    if (this.tickerT <= 0) {
      this.tickerT = 5200;
      this.ticker.setText(pick(BROADCAST_LINES));
    }
    this.ticker.setAlpha(0.35 + 0.25 * Math.sin(this.tickerT / 260));

    this.slab.clear();
    if (this.lowerT > 0) {
      this.lowerT -= dtMs;
      const a = this.lowerT <= 0 ? 0 : Math.min(1, this.lowerT / 320);
      this.lowerThird.setAlpha(a);
      if (a > 0) {
        const tw = Math.max(this.lowerThird.width, this.subtitle.width) + 52;
        const th = this.subT > 0 ? fsn(20) + fsn(15) + 18 : fsn(20) + 12;
        this.slab.fillStyle(0x0d0612, 0.82 * a);
        const sy = y + r.lower - 8;
        this.slab.fillRect(W / 2 - tw / 2, sy, tw, th);
        this.slab.fillStyle(C.pink, 0.9 * a);
        this.slab.fillRect(W / 2 - tw / 2, sy, tw, 3);
        this.slab.fillRect(W / 2 - tw / 2, sy + th - 3, tw, 3);
      }
    }
    if (this.subT > 0) {
      this.subT -= dtMs;
      if (this.subT <= 0) this.subtitle.setAlpha(0);
      else this.subtitle.setAlpha(Math.min(1, this.subT / 320));
    }

    // combo counters
    this.setCombo(this.comboL, left, padL, y + r.squelsh + 16, 0);
    this.setCombo(this.comboR, right, W - padR, y + r.squelsh + 16, 1);

    // --- bars ---
    const g = this.g;
    g.clear();
    const barW = Math.min(320, (W - padL - padR) / 2 - 108);
    const barH = r.barH;
    const barY = y + r.bar;

    this.healthBar(g, padL, barY, barW, barH, left, false, corrupt);
    this.healthBar(g, W - padR - barW, barY, barW, barH, right, true, corrupt);
    this.squelshBar(g, padL, y + r.squelsh, barW, 10, left, false);
    this.squelshBar(g, W - padR - barW, y + r.squelsh, barW, 10, right, true);

    // crowd heat, centre
    const hw = 168;
    const hx = W / 2 - hw / 2;
    const hy = y + r.heatBar;
    g.fillStyle(0x120a1a, 0.75);
    g.fillRect(hx - 2, hy - 2, hw + 4, 10);
    const heatCol = heat01 > 0.85 ? C.white : heat01 > 0.6 ? C.gold : heat01 > 0.3 ? C.orange : C.pink;
    g.fillStyle(heatCol, 0.95);
    g.fillRect(hx, hy, hw * heat01, 6);
    if (heat01 > 0.85) {
      g.lineStyle(2, C.white, 0.6 + 0.4 * Math.sin(this.tickerT / 90));
      g.strokeRect(hx - 3, hy - 3, hw + 6, 12);
    }
  }

  private setCombo(
    t: Phaser.GameObjects.Text, f: Fighter, x: number, y: number, origin: number,
  ): void {
    if (f.comboCount >= 2 && f.comboTimer > 0) {
      t.setText(`${f.comboCount} HIT COMBO`).setPosition(x, y).setOrigin(origin, 0);
      t.setAlpha(Math.min(1, f.comboTimer / 260));
    } else {
      t.setAlpha(0);
    }
  }

  private healthBar(
    g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number,
    f: Fighter, mirror: boolean, corrupt: number,
  ): void {
    g.fillStyle(0x120a1a, 0.8);
    g.fillRect(x - 3, y - 3, w + 6, h + 6);
    g.fillStyle(0x3a2440, 1);
    g.fillRect(x, y, w, h);

    const frac = f.healthFrac;
    const col = this.opts.highContrast
      ? (frac > 0.4 ? 0xffffff : C.gold)
      : (frac > 0.55 ? C.acid : frac > 0.28 ? C.gold : C.blood);
    const fw = w * frac;
    g.fillStyle(col, 1);
    if (mirror) g.fillRect(x + w - fw, y, fw, h);
    else g.fillRect(x, y, fw, h);

    // segment ticks so damage is readable without relying on colour alone
    g.lineStyle(1.5, 0x120a1a, 0.6);
    for (let i = 1; i < 4; i++) g.lineBetween(x + (w / 4) * i, y, x + (w / 4) * i, y + h);
    g.lineStyle(2, corrupt > 0 ? C.pink : 0xffffff, 0.35);
    g.strokeRect(x, y, w, h);

    if (f.exhausted) {
      g.fillStyle(C.blood, 0.35 + 0.25 * Math.sin(Date.now() / 120));
      g.fillRect(x, y, w, h);
    }
  }

  private squelshBar(
    g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number,
    f: Fighter, mirror: boolean,
  ): void {
    g.fillStyle(0x120a1a, 0.8);
    g.fillRect(x - 2, y - 2, w + 4, h + 4);
    g.fillStyle(0x241a2e, 1);
    g.fillRect(x, y, w, h);
    const frac = f.squelsh / TUNING.meters.squelshMax;
    const full = frac >= 1;
    const col = full ? C.gold : frac >= 0.5 ? C.acid : C.cyan;
    const fw = w * frac;
    g.fillStyle(col, 1);
    if (mirror) g.fillRect(x + w - fw, y, fw, h);
    else g.fillRect(x, y, fw, h);

    // signature threshold marker (the halfway point either way round)
    const mx = x + w * 0.5;
    g.lineStyle(2, 0xffffff, 0.8);
    g.lineBetween(mx, y - 2, mx, y + h + 2);
    if (full) {
      g.lineStyle(2, C.gold, 0.6 + 0.4 * Math.sin(Date.now() / 90));
      g.strokeRect(x - 3, y - 3, w + 6, h + 6);
    }
  }

  destroy(): void {
    this.root.destroy(true);
  }
}
