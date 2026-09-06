import Phaser from 'phaser';
import { C, CSS, FONT } from '@/game/config/palette';
import { TUNING } from '@/game/config/tuning';
import { crtOverlay, drawPanel, makeButton, panel, slam } from '@/game/ui/Kit';
import { ScrollList } from '@/game/ui/Widgets';
import { fs, fsn } from '@/game/config/type';

const W = TUNING.view.width;

/**
 * Controls explainer. Doubles as the shell for the Boob Camp tutorial mode.
 *
 * Scrolls, because at phone-readable type the rules do not fit on one screen
 * and shrinking them back down is exactly the problem this replaces.
 */
export class HowToScene extends Phaser.Scene {
  private list!: ScrollList;

  constructor() { super('HowTo'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0410');
    const bg = this.add.graphics();
    bg.fillStyle(0x120818, 1);
    bg.fillRect(0, 0, W, TUNING.view.height);

    slam(this, 140, 28, 'HOW TO PLAY', 24, CSS.acid, -3);
    this.add.text(W - 20, 18, 'DRAG TO SCROLL', {
      fontFamily: FONT.mono, fontSize: fs(9), color: CSS.bone,
    }).setOrigin(1, 0).setAlpha(0.6);

    this.list = new ScrollList(this, 60, 402);
    const add = (o: Phaser.GameObjects.GameObject): void => { this.list.content.add(o); };

    const pad = 16;
    const gutter = 20;
    const colW = (W - 48 - gutter) / 2;
    const leftX = 24;
    const rightX = 24 + colW + gutter;
    // Both diagram panels are drawn to a common measured height after their
    // contents exist, so a longer caption grows the box instead of spilling.
    const leftPanel = this.add.graphics();
    const rightPanel = this.add.graphics();
    add(leftPanel); add(rightPanel);

    // --- LEFT THUMB ---
    add(this.add.text(leftX + pad, pad, 'LEFT THUMB', {
      fontFamily: FONT.slam, fontSize: fs(16), color: CSS.pink,
    }));
    const stickCX = leftX + colW / 2;
    const stickCY = pad + fsn(16) + 68;
    const stick = this.add.graphics();
    stick.lineStyle(4, C.pink, 0.9);
    stick.strokeCircle(stickCX, stickCY, 52);
    stick.fillStyle(C.pink, 0.5);
    stick.fillCircle(stickCX, stickCY, 22);
    stick.lineStyle(2, C.acid, 0.7);
    stick.strokeCircle(stickCX, stickCY, 29);
    add(stick);
    const leftCap = this.add.text(stickCX, stickCY + 64,
      'MOVE ANYWHERE IN THE RING\nPUSH FULLY OR DOUBLE-TAP TO RUN\nRUN INTO THE ROPES TO REBOUND', {
      fontFamily: FONT.mono, fontSize: fs(9), color: CSS.bone,
      align: 'center', lineSpacing: 4, wordWrap: { width: colW - pad * 2 },
    }).setOrigin(0.5, 0).setAlpha(0.85);
    add(leftCap);

    // --- RIGHT THUMB ---
    add(this.add.text(rightX + pad, pad, 'RIGHT THUMB', {
      fontFamily: FONT.slam, fontSize: fs(16), color: CSS.cyan,
    }));
    const bCY = pad + fsn(16) + 62;
    const bCX = rightX + colW / 2;
    const btns: [string, string, number, number, number][] = [
      ['STRIKE', 'TAP = QUICK  ·  HOLD = HEAVY', C.pink, bCX + 76, bCY + 22],
      ['GRAPPLE', 'GRAB, THROW, AND PIN', C.cyan, bCX - 54, bCY + 8],
      ['SQUELSH', 'SIGNATURE / FINISHER / TAUNT', C.acid, bCX + 8, bCY - 56],
    ];
    const g = this.add.graphics();
    for (const [label, , col, x, cy] of btns) {
      g.fillStyle(col, 0.22);
      g.fillCircle(x, cy, 47);
      g.lineStyle(3.5, col, 0.9);
      g.strokeCircle(x, cy, 47);
      add(this.add.text(x, cy, label, {
        fontFamily: FONT.slam, fontSize: fs(11), color: CSS.white,
      }).setOrigin(0.5));
    }
    add(g);
    const rightCap = this.add.text(bCX, bCY + 78, btns.map(([l, d]) => `${l} — ${d}`).join('\n'), {
      fontFamily: FONT.mono, fontSize: fs(9), color: CSS.bone,
      align: 'center', lineSpacing: 4, wordWrap: { width: colW - pad * 2 },
    }).setOrigin(0.5, 0).setAlpha(0.85);
    add(rightCap);

    const diagramH = Math.max(
      leftCap.y + leftCap.height, rightCap.y + rightCap.height,
    ) + pad;
    drawPanel(leftPanel, leftX, 0, colW, diagramH, C.pink, 0.08);
    drawPanel(rightPanel, rightX, 0, colW, diagramH, C.cyan, 0.08);

    // --- THE RULES, full width so the prose wraps to two lines, not seven ---
    const lines: [string, string][] = [
      ['REVERSAL', 'Hold STRIKE + GRAPPLE as an attack starts. Perfect timing steals the momentum.'],
      ['SQUELSH', 'Fills as you hit, get hit, reverse and taunt. Half = SIGNATURE. Full = FINISHER.'],
      ['CROWD HEAT', 'Combos, reversals, specials and taunts pop the crowd. Hot crowds change the arena itself.'],
      ['PINS', 'Knock them down, stand close, press GRAPPLE. Mash any button to kick out of theirs.'],
      ['TAUNT', 'Press SQUELSH on an empty meter. Free heat, wide open.'],
    ];
    const rulesTop = diagramH + 18;
    const rulesW = W - 48;
    const keyW = 150;
    let ry = rulesTop + pad + fsn(16) + 12;
    const rows: Phaser.GameObjects.Text[] = [];
    for (const [k, v] of lines) {
      const kt = this.add.text(leftX + pad, ry, k, {
        fontFamily: FONT.slam, fontSize: fs(12), color: CSS.acid,
      });
      const vt = this.add.text(leftX + pad + keyW, ry, v, {
        fontFamily: FONT.mono, fontSize: fs(9), color: CSS.bone,
        wordWrap: { width: rulesW - pad * 2 - keyW }, lineSpacing: 3,
      }).setAlpha(0.85);
      rows.push(kt, vt);
      ry += Math.max(kt.height, vt.height) + 10;
    }
    add(panel(this, leftX, rulesTop, rulesW, ry - rulesTop + 4, C.gold, 0.08));
    add(this.add.text(leftX + pad, rulesTop + pad, 'THE RULES', {
      fontFamily: FONT.slam, fontSize: fs(16), color: CSS.gold,
    }));
    for (const t of rows) add(t);

    const kb = this.add.text(W / 2, ry + 26,
      'KEYBOARD: WASD / ARROWS MOVE · J STRIKE · K GRAPPLE · L SQUELSH · SPACE REVERSAL · ESC PAUSE', {
      fontFamily: FONT.mono, fontSize: fs(9), color: CSS.gold,
      align: 'center', wordWrap: { width: W - 80 },
    }).setOrigin(0.5, 0).setAlpha(0.9);
    add(kb);
    this.list.setContentHeight(ry + 26 + kb.height + 24);

    const footer = this.add.graphics().setDepth(750);
    footer.fillStyle(0x0a0410, 0.95);
    footer.fillRect(0, 470, W, TUNING.view.height - 470);
    makeButton(this, 110, 502, 'BACK', () => this.scene.start('Menu'),
      { w: 160, h: 44, color: C.steel, size: 15 }).container.setDepth(760);
    makeButton(this, W - 130, 502, 'FIGHT NOW', () => this.scene.start('Select'),
      { w: 200, h: 44, color: C.blood, size: 18 }).container.setDepth(760);

    crtOverlay(this);
    this.cameras.main.fadeIn(200, 0, 0, 0);
  }

  override update(): void {
    this.list.update();
  }
}
