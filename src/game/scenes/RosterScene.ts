import Phaser from 'phaser';
import { C, CSS, FONT } from '@/game/config/palette';
import { TUNING } from '@/game/config/tuning';
import { ROSTER, ROSTER_ROADMAP } from '@/game/data/characters';
import { Portrait } from '@/game/render/Portrait';
import { FS } from '@/game/combat/states';
import { crtOverlay, makeButton, panel, slam } from '@/game/ui/Kit';
import { ScrollList } from '@/game/ui/Widgets';
import { Save } from '@/game/save/SaveManager';
import { fs, fsn } from '@/game/config/type';

const W = TUNING.view.width;

/**
 * Trading-card roster: playable wrestlers plus the documented roadmap.
 *
 * Like the Archives, every card is measured rather than hand-offset — text
 * sizes float with the readability floor, so fixed row positions would collide.
 */
export class RosterScene extends Phaser.Scene {
  private list!: ScrollList;
  private portraits: Portrait[] = [];

  constructor() { super('Roster'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0410');
    const bg = this.add.graphics();
    bg.fillStyle(0x14081c, 1);
    bg.fillRect(0, 0, W, TUNING.view.height);

    slam(this, 110, 28, 'ROSTER', 24, CSS.cyan, -3);
    this.add.text(W - 20, 18, 'PLACEHOLDER ART — APPROVED LIKENESSES DROP IN LATER', {
      fontFamily: FONT.mono, fontSize: fs(9), color: CSS.gold,
    }).setOrigin(1, 0).setAlpha(0.8);

    this.list = new ScrollList(this, 62, 420);
    let y = 0;

    const cardX = 24;
    const cardW = W - 76;
    const pad = 16;
    const movesW = 340;
    const movesX = cardX + cardW - pad - movesW;
    const textX = cardX + 196;
    const textW = movesX - textX - 20;

    for (const w of ROSTER) {
      const rec = Save.get().records[w.id] ?? { wins: 0, losses: 0, bestRating: 0, bestHeat: 0 };
      const kids: Phaser.GameObjects.GameObject[] = [];
      const top = y + pad;

      let ty = top;
      const row = (
        text: string, size: string, color: string, family: string,
        alpha = 1, gap = 5, spacing = 0,
      ): void => {
        const t = this.add.text(textX, ty, text, {
          fontFamily: family, fontSize: size, color,
          wordWrap: { width: textW }, lineSpacing: spacing,
        }).setAlpha(alpha);
        ty += t.height + gap;
        kids.push(t);
      };

      row(w.displayName, fs(26), CSS.white, FONT.slam, 1, 4);
      row(`${w.tagline}  ·  ${w.archetype}  ·  ${w.alignment}`, fs(9), CSS.gold, FONT.mono, 1, 6, 2);
      row(`REAL PERSONA — ${w.publicPersonaSummary}`, fs(9), CSS.bone, FONT.mono, 0.72, 6, 3);
      row(`SOURCING: ${w.personaResearch}`, fs(8), CSS.cyan, FONT.mono, 0.7, 0, 2);

      const moves =
        `LIGHT     ${w.moves.light.name}\n` +
        `HEAVY     ${w.moves.heavy.name}\n` +
        `GRAPPLE   ${w.moves.grapple.name}\n` +
        `SIGNATURE ${w.moves.signature.name}\n` +
        `FINISHER  ${w.moves.finisher.name}\n` +
        `PROP      ${w.prop?.name ?? '—'}`;
      const mv = this.add.text(movesX, top, moves, {
        fontFamily: FONT.mono, fontSize: fs(9), color: CSS.white,
        wordWrap: { width: movesW }, lineSpacing: 4,
      }).setAlpha(0.9);
      kids.push(mv);
      const recT = this.add.text(movesX, top + mv.height + 8,
        `RECORD ${rec.wins}W / ${rec.losses}L\nBEST SQUELSH ${rec.bestRating}/5`, {
        fontFamily: FONT.slam, fontSize: fs(12), color: CSS.acid, lineSpacing: 2,
      });
      kids.push(recT);

      const cardH = Math.max(ty, top + mv.height + 8 + recT.height, top + 150) - y + pad;
      this.list.content.add(panel(this, cardX, y, cardW, cardH - 10,
        w.alignment === 'HEEL' ? C.pink : C.acid, 0.1));

      // portrait sits on the card floor, scaled to whatever height the card took
      const p = new Portrait(this, w, cardX + 102, y + cardH - 18, 0.78, 1);
      p.setPose(FS.IDLE);
      this.portraits.push(p);
      this.list.content.add(p.root);
      this.list.content.add(kids);

      y += cardH;
    }

    // roadmap
    y += 10;
    this.list.content.add(this.add.text(24, y, 'DOCUMENTED PERSONAS NOT YET PLAYABLE', {
      fontFamily: FONT.slam, fontSize: fs(17), color: CSS.gold,
    }));
    y += fsn(17) + 14;
    const roadPitch = fsn(10) + 8;
    for (const r of ROSTER_ROADMAP) {
      this.list.content.add(this.add.text(30, y, `${r.wave}  ·  ${r.name}`, {
        fontFamily: FONT.mono, fontSize: fs(10), color: CSS.white,
      }).setAlpha(0.85));
      this.list.content.add(this.add.text(W / 2 - 20, y, `${r.archetype} — ${r.note}`, {
        fontFamily: FONT.mono, fontSize: fs(9), color: CSS.bone,
      }).setAlpha(0.6));
      y += roadPitch;
    }
    y += 14;
    this.list.content.add(this.add.text(30, y,
      'Final spellings, likenesses, props and signature moves require Choke Hole team confirmation.', {
      fontFamily: FONT.mono, fontSize: fs(9), color: CSS.cyan, wordWrap: { width: W - 90 },
    }).setAlpha(0.7));

    this.list.setContentHeight(y + 50);

    const footer = this.add.graphics().setDepth(750);
    footer.fillStyle(0x0a0410, 0.95);
    footer.fillRect(0, 486, W, TUNING.view.height - 486);
    makeButton(this, 70, 512, 'BACK', () => this.scene.start('Menu'),
      { w: 116, h: 38, color: C.steel, size: 13 }).container.setDepth(760);
    crtOverlay(this);
    this.cameras.main.fadeIn(200, 0, 0, 0);
  }

  override update(_t: number, dt: number): void {
    this.list.update();
    for (const p of this.portraits) p.update(dt);
  }
}
