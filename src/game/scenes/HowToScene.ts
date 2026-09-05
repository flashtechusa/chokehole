import Phaser from 'phaser';
import { C, CSS, FONT } from '@/game/config/palette';
import { TUNING } from '@/game/config/tuning';
import { centerLegacyLayout, crtOverlay, makeButton, panel, slam } from '@/game/ui/Kit';

const W = TUNING.view.width;
/** Laid out against the 960-wide reference, then centred. */
const REF_W = 960;

/** Controls explainer. Doubles as the shell for the Boob Camp tutorial mode. */
export class HowToScene extends Phaser.Scene {
  constructor() { super('HowTo'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0410');
    const bg = this.add.graphics();
    bg.fillStyle(0x120818, 1);
    bg.fillRect(-500, 0, W + 1000, TUNING.view.height);

    slam(this, 152, 30, 'HOW TO PLAY', 28, CSS.acid, -3);

    // left thumb diagram
    panel(this, 24, 58, 300, 300, C.pink, 0.08);
    this.add.text(40, 70, 'LEFT THUMB', { fontFamily: FONT.slam, fontSize: '18px', color: CSS.pink });
    const stick = this.add.graphics();
    stick.lineStyle(4, C.pink, 0.9);
    stick.strokeCircle(174, 190, 62);
    stick.fillStyle(C.pink, 0.5);
    stick.fillCircle(174, 190, 26);
    stick.lineStyle(2, C.acid, 0.7);
    stick.strokeCircle(174, 190, 34);
    this.add.text(174, 272, 'MOVE ANYWHERE IN THE RING\nPUSH FULLY OR DOUBLE-TAP TO RUN\nRUN INTO THE ROPES TO REBOUND', {
      fontFamily: FONT.mono, fontSize: '10px', color: CSS.bone, align: 'center', lineSpacing: 4,
    }).setOrigin(0.5, 0).setAlpha(0.85);

    // right thumb diagram
    panel(this, 340, 58, 300, 300, C.cyan, 0.08);
    this.add.text(356, 70, 'RIGHT THUMB', { fontFamily: FONT.slam, fontSize: '18px', color: CSS.cyan });
    const btns: [string, string, number, number, number][] = [
      ['STRIKE', 'TAP = QUICK  ·  HOLD = HEAVY', C.pink, 560, 236],
      ['GRAPPLE', 'GRAB, THROW, AND PIN', C.cyan, 452, 218],
      ['SQUELSH', 'SIGNATURE / FINISHER / TAUNT', C.acid, 486, 152],
    ];
    const g = this.add.graphics();
    for (const [label, , col, x, y] of btns) {
      g.fillStyle(col, 0.22);
      g.fillCircle(x, y, 40);
      g.lineStyle(3.5, col, 0.9);
      g.strokeCircle(x, y, 40);
      this.add.text(x, y, label, {
        fontFamily: FONT.slam, fontSize: '13px', color: CSS.white,
      }).setOrigin(0.5);
    }
    this.add.text(490, 296, btns.map(([l, d]) => `${l}  —  ${d}`).join('\n'), {
      fontFamily: FONT.mono, fontSize: '9px', color: CSS.bone, align: 'center', lineSpacing: 4,
    }).setOrigin(0.5, 0).setAlpha(0.85);

    // systems
    panel(this, 656, 58, 280, 300, C.gold, 0.08);
    this.add.text(672, 70, 'THE RULES', { fontFamily: FONT.slam, fontSize: '18px', color: CSS.gold });
    const lines = [
      ['REVERSAL', 'Hold STRIKE + GRAPPLE as an attack starts. Perfect timing steals the momentum.'],
      ['SQUELSH', 'Fills as you hit, get hit, reverse and taunt. Half = SIGNATURE. Full = FINISHER.'],
      ['CROWD HEAT', 'Combos, reversals, specials and taunts pop the crowd. Hot crowds change the arena itself.'],
      ['PINS', 'Knock them down, stand close, press GRAPPLE. Mash any button to kick out of theirs.'],
      ['TAUNT', 'Press SQUELSH on an empty meter. Free heat, wide open.'],
    ];
    let y = 96;
    for (const [k, v] of lines) {
      this.add.text(672, y, k!, { fontFamily: FONT.slam, fontSize: '12px', color: CSS.acid });
      const t = this.add.text(672, y + 15, v!, {
        fontFamily: FONT.mono, fontSize: '9px', color: CSS.bone,
        wordWrap: { width: 250 }, lineSpacing: 2,
      }).setAlpha(0.8);
      y += 15 + t.height + 5;
    }

    this.add.text(REF_W / 2, 382, 'KEYBOARD: WASD / ARROWS MOVE  ·  J STRIKE  ·  K GRAPPLE  ·  L SQUELSH  ·  SPACE REVERSAL  ·  ESC PAUSE', {
      fontFamily: FONT.mono, fontSize: '10px', color: CSS.gold,
    }).setOrigin(0.5).setAlpha(0.9);

    makeButton(this, 190, 440, 'BACK', () => this.scene.start('Menu'),
      { w: 180, h: 46, color: C.steel, size: 16 });
    makeButton(this, REF_W - 190, 440, 'FIGHT NOW', () => this.scene.start('Select'),
      { w: 220, h: 46, color: C.blood, size: 20 });

    centerLegacyLayout(this);
    crtOverlay(this);
    this.cameras.main.fadeIn(200, 0, 0, 0);
  }
}
