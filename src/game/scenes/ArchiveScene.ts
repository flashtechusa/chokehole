import Phaser from 'phaser';
import { C, CSS, FONT } from '@/game/config/palette';
import { TUNING } from '@/game/config/tuning';
import { TOUR_STOPS } from '@/game/data/worldtour/venues';
import { ARENAS_BY_ID } from '@/game/data/arenas';
import { crtOverlay, makeButton, panel, slam } from '@/game/ui/Kit';
import { ScrollList } from '@/game/ui/Widgets';
import { Save } from '@/game/save/SaveManager';

const W = TUNING.view.width;

/**
 * CHOKE HOLE ARCHIVES — the World Tour spine.
 *
 * The top half of every card is the REAL layer, printed verbatim from the venue
 * database including its research status. The bottom half is clearly labelled
 * GAME FICTION. The two never blend (Design Bible section 4).
 */
export class ArchiveScene extends Phaser.Scene {
  private list!: ScrollList;

  constructor() { super('Archive'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0410');
    const bg = this.add.graphics();
    bg.fillStyle(0x120818, 1);
    bg.fillRect(0, 0, W, TUNING.view.height);

    slam(this, 190, 30, 'CHOKE HOLE ARCHIVES', 26, CSS.gold, -3);
    this.add.text(W / 2 + 130, 22, 'REAL VENUES · REAL DATES · FICTIONAL MATCHES', {
      fontFamily: FONT.mono, fontSize: '10px', color: CSS.acid,
    }).setOrigin(0.5, 0).setAlpha(0.85);

    const done = Save.get().tourCompleted.length;
    this.add.text(W - 20, 22, `${done}/${TOUR_STOPS.length} STOPS CLEARED`, {
      fontFamily: FONT.mono, fontSize: '10px', color: CSS.bone,
    }).setOrigin(1, 0).setAlpha(0.7);

    this.list = new ScrollList(this, 52, 434);

    let y = 0;
    const cardH = 128;
    for (const stop of TOUR_STOPS) {
      const playable = stop.status === 'PLAYABLE' && stop.arenaId !== null;
      const cleared = Save.get().tourCompleted.includes(stop.id);
      const col = playable ? (cleared ? C.acid : C.gold) : C.steel;

      const g = panel(this, 24, y, W - 76, cardH - 10, col, playable ? 0.1 : 0.04);
      this.list.content.add(g);

      const idx = this.add.text(40, y + 12, String(stop.order).padStart(2, '0'), {
        fontFamily: FONT.slam, fontSize: '26px', color: CSS.white,
      }).setAlpha(0.35);
      const chapter = this.add.text(78, y + 14, stop.chapter, {
        fontFamily: FONT.mono, fontSize: '10px', color: `#${col.toString(16).padStart(6, '0')}`,
      });
      const title = this.add.text(78, y + 30, stop.history.eventName, {
        fontFamily: FONT.slam, fontSize: '19px', color: CSS.white,
        wordWrap: { width: 560 },
      });
      const where = this.add.text(78, y + 56, `${stop.history.venue}  ·  ${stop.history.city}  ·  ${stop.history.date}`, {
        fontFamily: FONT.mono, fontSize: '10px', color: CSS.gold,
        wordWrap: { width: 600 },
      });
      const note = this.add.text(78, y + 76, stop.history.note, {
        fontFamily: FONT.mono, fontSize: '9px', color: CSS.bone,
        wordWrap: { width: 640 }, lineSpacing: 2,
      }).setAlpha(0.7);
      const research = this.add.text(78, y + cardH - 26, `RESEARCH: ${stop.history.research}`, {
        fontFamily: FONT.mono, fontSize: '8px', color: CSS.cyan,
      }).setAlpha(0.75);
      this.list.content.add([idx, chapter, title, where, note, research]);

      const fiction = this.add.text(W - 430, y + 14,
        `GAME FICTION\n${stop.fiction.objective}\n${stop.fiction.twist}`, {
        fontFamily: FONT.mono, fontSize: '9px', color: CSS.pink,
        wordWrap: { width: 206 }, lineSpacing: 3,
      }).setAlpha(0.85);
      this.list.content.add(fiction);

      if (playable) {
        const arena = ARENAS_BY_ID[stop.arenaId!];
        const unlocked = arena ? Save.isArenaUnlocked(arena.id) : false;
        const b = makeButton(this, W - 116, y + 60, unlocked ? 'FIGHT HERE' : 'LOCKED', () => {
          if (!unlocked) return;
          this.scene.start('Select', { arenaId: stop.arenaId, tourStopId: stop.id });
        }, {
          w: 172, h: 42, size: 15,
          color: unlocked ? C.blood : C.steel,
          sub: unlocked ? (cleared ? 'CLEARED' : 'OPEN') : (arena?.unlock.label ?? 'LOCKED'),
          disabled: !unlocked,
        });
        this.list.content.add(b.container);
      } else {
        const t = this.add.text(W - 116, y + 60, 'ARENA ON THE ROADMAP', {
          fontFamily: FONT.mono, fontSize: '9px', color: CSS.bone,
          align: 'center', wordWrap: { width: 168 },
        }).setOrigin(0.5).setAlpha(0.5);
        this.list.content.add(t);
      }

      y += cardH;
    }
    this.list.setContentHeight(y + 20);

    const footer = this.add.graphics().setDepth(750);
    footer.fillStyle(0x0a0410, 0.95);
    footer.fillRect(0, 488, W, TUNING.view.height - 488);
    makeButton(this, 62, 512, 'BACK', () => this.scene.start('Menu'),
      { w: 104, h: 34, color: C.steel, size: 14 }).container.setDepth(760);
    crtOverlay(this);
    this.cameras.main.fadeIn(200, 0, 0, 0);
  }

  override update(): void {
    this.list.update();
  }
}
