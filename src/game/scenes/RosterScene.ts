import Phaser from 'phaser';
import { C, CSS, FONT } from '@/game/config/palette';
import { TUNING } from '@/game/config/tuning';
import { ROSTER, ROSTER_ROADMAP } from '@/game/data/characters';
import { Portrait } from '@/game/render/Portrait';
import { FS } from '@/game/combat/states';
import { crtOverlay, makeButton, panel, slam } from '@/game/ui/Kit';
import { ScrollList } from '@/game/ui/Widgets';
import { Save } from '@/game/save/SaveManager';

const W = TUNING.view.width;

/** Trading-card roster: playable wrestlers plus the documented roadmap. */
export class RosterScene extends Phaser.Scene {
  private list!: ScrollList;
  private portraits: Portrait[] = [];

  constructor() { super('Roster'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0410');
    const bg = this.add.graphics();
    bg.fillStyle(0x14081c, 1);
    bg.fillRect(0, 0, W, TUNING.view.height);

    slam(this, 120, 30, 'ROSTER', 28, CSS.cyan, -3);
    this.add.text(W / 2, 22, 'PLACEHOLDER ART — APPROVED PERFORMER LIKENESSES DROP IN LATER', {
      fontFamily: FONT.mono, fontSize: '9px', color: CSS.gold,
    }).setOrigin(0.5, 0).setAlpha(0.8);

    this.list = new ScrollList(this, 52, 432);
    let y = 0;

    for (const w of ROSTER) {
      const rec = Save.get().records[w.id] ?? { wins: 0, losses: 0, bestRating: 0, bestHeat: 0 };
      const cardH = 172;
      this.list.content.add(panel(this, 24, y, W - 76, cardH - 10,
        w.alignment === 'HEEL' ? C.pink : C.acid, 0.1));

      const p = new Portrait(this, w, 112, y + 158, 0.76, 1);
      p.setPose(FS.TAUNT);
      this.portraits.push(p);
      this.list.content.add(p.root);

      this.list.content.add(this.add.text(200, y + 14, w.displayName, {
        fontFamily: FONT.slam, fontSize: '28px', color: CSS.white,
      }));
      this.list.content.add(this.add.text(200, y + 46, `${w.tagline}  ·  ${w.archetype}  ·  ${w.alignment}`, {
        fontFamily: FONT.mono, fontSize: '10px', color: CSS.gold,
      }));
      this.list.content.add(this.add.text(200, y + 66, `REAL PERSONA — ${w.publicPersonaSummary}`, {
        fontFamily: FONT.mono, fontSize: '9px', color: CSS.bone,
        wordWrap: { width: 420 }, lineSpacing: 2,
      }).setAlpha(0.72));
      this.list.content.add(this.add.text(200, y + 126, `SOURCING: ${w.personaResearch}`, {
        fontFamily: FONT.mono, fontSize: '8px', color: CSS.cyan,
      }).setAlpha(0.7));

      const moves =
        `LIGHT     ${w.moves.light.name}\n` +
        `HEAVY     ${w.moves.heavy.name}\n` +
        `GRAPPLE   ${w.moves.grapple.name}\n` +
        `SIGNATURE ${w.moves.signature.name}\n` +
        `FINISHER  ${w.moves.finisher.name}\n` +
        `PROP      ${w.prop?.name ?? '—'}`;
      this.list.content.add(this.add.text(W - 314, y + 16, moves, {
        fontFamily: FONT.mono, fontSize: '10px', color: CSS.white, lineSpacing: 4,
      }).setAlpha(0.9));
      this.list.content.add(this.add.text(W - 314, y + 122,
        `RECORD ${rec.wins}W / ${rec.losses}L   BEST SQUELSH ${rec.bestRating}/5`, {
        fontFamily: FONT.slam, fontSize: '12px', color: CSS.acid,
      }));

      y += cardH;
    }

    // roadmap
    this.list.content.add(this.add.text(24, y + 8, 'DOCUMENTED PERSONAS NOT YET PLAYABLE', {
      fontFamily: FONT.slam, fontSize: '17px', color: CSS.gold,
    }));
    y += 36;
    for (const r of ROSTER_ROADMAP) {
      this.list.content.add(this.add.text(30, y, `${r.wave.padEnd(12)} ${r.name}`, {
        fontFamily: FONT.mono, fontSize: '11px', color: CSS.white,
      }).setAlpha(0.85));
      this.list.content.add(this.add.text(430, y, `${r.archetype}  —  ${r.note}`, {
        fontFamily: FONT.mono, fontSize: '9px', color: CSS.bone,
      }).setAlpha(0.6));
      y += 22;
    }
    y += 12;
    this.list.content.add(this.add.text(30, y,
      'Final spellings, likenesses, props and signature moves require Choke Hole team confirmation.', {
      fontFamily: FONT.mono, fontSize: '9px', color: CSS.cyan,
    }).setAlpha(0.7));

    this.list.setContentHeight(y + 40);

    const footer = this.add.graphics().setDepth(750);
    footer.fillStyle(0x0a0410, 0.95);
    footer.fillRect(0, 488, W, TUNING.view.height - 488);
    makeButton(this, 62, 512, 'BACK', () => this.scene.start('Menu'),
      { w: 104, h: 34, color: C.steel, size: 14 }).container.setDepth(760);
    crtOverlay(this);
    this.cameras.main.fadeIn(200, 0, 0, 0);
  }

  override update(_t: number, dt: number): void {
    this.list.update();
    for (const p of this.portraits) p.update(dt);
  }
}
