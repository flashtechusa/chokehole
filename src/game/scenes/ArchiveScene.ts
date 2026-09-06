import Phaser from 'phaser';
import { C, CSS, FONT } from '@/game/config/palette';
import { TUNING } from '@/game/config/tuning';
import { TOUR_STOPS } from '@/game/data/worldtour/venues';
import { ARENAS_BY_ID } from '@/game/data/arenas';
import { crtOverlay, makeButton, panel, slam } from '@/game/ui/Kit';
import { ScrollList } from '@/game/ui/Widgets';
import { Save } from '@/game/save/SaveManager';
import { fs } from '@/game/config/type';

const W = TUNING.view.width;

/**
 * CHOKE HOLE ARCHIVES — the World Tour spine.
 *
 * The top half of every card is the REAL layer, printed verbatim from the venue
 * database including its research status. The bottom half is clearly labelled
 * GAME FICTION. The two never blend (Design Bible section 4).
 *
 * Card geometry is measured, not hand-tuned: every row is placed from the
 * rendered height of the row above it and the card grows to fit. Text sizes are
 * driven by the readability floor in config/type, so they change between
 * devices and settings — fixed offsets could not survive that.
 */
export class ArchiveScene extends Phaser.Scene {
  private list!: ScrollList;

  constructor() { super('Archive'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0410');
    const bg = this.add.graphics();
    bg.fillStyle(0x120818, 1);
    bg.fillRect(0, 0, W, TUNING.view.height);

    slam(this, 200, 28, 'CHOKE HOLE ARCHIVES', 22, CSS.gold, -3);
    this.add.text(W - 20, 18, 'REAL VENUES · REAL DATES · FICTIONAL MATCHES', {
      fontFamily: FONT.mono, fontSize: fs(9), color: CSS.acid,
    }).setOrigin(1, 0).setAlpha(0.85);

    const done = Save.get().tourCompleted.length;
    this.add.text(W - 20, 40, `${done}/${TOUR_STOPS.length} STOPS CLEARED`, {
      fontFamily: FONT.mono, fontSize: fs(9), color: CSS.bone,
    }).setOrigin(1, 0).setAlpha(0.7);

    this.list = new ScrollList(this, 68, 414);

    // Column geometry, derived from the live canvas width.
    const cardX = 24;
    const cardW = W - 76;
    const padX = 16;
    const railW = 296;                       // right-hand fiction + action rail
    const numX = cardX + padX;
    const textX = numX + 40;
    const railX = cardX + cardW - padX - railW;
    const textW = railX - textX - 20;

    let y = 0;
    for (const stop of TOUR_STOPS) {
      const playable = stop.status === 'PLAYABLE' && stop.arenaId !== null;
      const cleared = Save.get().tourCompleted.includes(stop.id);
      const col = playable ? (cleared ? C.acid : C.gold) : C.steel;
      const colCss = `#${col.toString(16).padStart(6, '0')}`;

      const kids: Phaser.GameObjects.GameObject[] = [];
      const top = y + padX;

      const idx = this.add.text(numX, top, String(stop.order).padStart(2, '0'), {
        fontFamily: FONT.slam, fontSize: fs(22), color: CSS.white,
      }).setAlpha(0.35);
      kids.push(idx);

      // --- REAL layer, stacked from measured heights ---
      let ty = top;
      const row = (
        text: string, size: string, color: string, family: string,
        alpha = 1, gap = 4, spacing = 0,
      ): Phaser.GameObjects.Text => {
        const t = this.add.text(textX, ty, text, {
          fontFamily: family, fontSize: size, color,
          wordWrap: { width: textW }, lineSpacing: spacing,
        }).setAlpha(alpha);
        ty += t.height + gap;
        kids.push(t);
        return t;
      };

      row(stop.chapter, fs(9), colCss, FONT.mono, 0.95, 3);
      row(stop.history.eventName, fs(17), CSS.white, FONT.slam, 1, 5);
      row(
        `${stop.history.venue}  ·  ${stop.history.city}  ·  ${stop.history.date}`,
        fs(9), CSS.gold, FONT.mono, 1, 5, 2,
      );
      row(stop.history.note, fs(9), CSS.bone, FONT.mono, 0.7, 6, 3);
      row(`RESEARCH: ${stop.history.research}`, fs(8), CSS.cyan, FONT.mono, 0.75, 0, 2);
      const leftBottom = ty;

      // --- GAME FICTION layer + action, on the right rail ---
      let ry = top;
      const fiction = this.add.text(railX, ry,
        `GAME FICTION\n${stop.fiction.objective}\n${stop.fiction.twist}`, {
        fontFamily: FONT.mono, fontSize: fs(9), color: CSS.pink,
        wordWrap: { width: railW }, lineSpacing: 3,
      }).setAlpha(0.85);
      kids.push(fiction);
      ry += fiction.height + 12;

      const btnH = 44;
      const actionY = ry + btnH / 2;
      if (playable) {
        const arena = ARENAS_BY_ID[stop.arenaId!];
        const unlocked = arena ? Save.isArenaUnlocked(arena.id) : false;
        const b = makeButton(this, railX + railW / 2, actionY, unlocked ? 'FIGHT HERE' : 'LOCKED', () => {
          if (!unlocked) return;
          this.scene.start('Select', { arenaId: stop.arenaId, tourStopId: stop.id });
        }, {
          w: railW, h: btnH, size: 14,
          color: unlocked ? C.blood : C.steel,
          sub: unlocked ? (cleared ? 'CLEARED' : 'OPEN') : (arena?.unlock.label ?? 'LOCKED'),
          disabled: !unlocked,
        });
        kids.push(b.container);
        ry += btnH;
      } else {
        const t = this.add.text(railX + railW / 2, ry, 'ARENA ON THE ROADMAP', {
          fontFamily: FONT.mono, fontSize: fs(9), color: CSS.bone,
          align: 'center', wordWrap: { width: railW },
        }).setOrigin(0.5, 0).setAlpha(0.5);
        kids.push(t);
        ry += t.height;
      }

      const cardH = Math.max(leftBottom, ry) - y + padX;
      const g = panel(this, cardX, y, cardW, cardH - 10, col, playable ? 0.1 : 0.04);
      this.list.content.add(g);
      this.list.content.add(kids);

      y += cardH;
    }
    this.list.setContentHeight(y + 20);

    const footer = this.add.graphics().setDepth(750);
    footer.fillStyle(0x0a0410, 0.95);
    footer.fillRect(0, 486, W, TUNING.view.height - 486);
    makeButton(this, 70, 512, 'BACK', () => this.scene.start('Menu'),
      { w: 116, h: 38, color: C.steel, size: 13 }).container.setDepth(760);
    crtOverlay(this);
    this.cameras.main.fadeIn(200, 0, 0, 0);
  }

  override update(): void {
    this.list.update();
  }
}
