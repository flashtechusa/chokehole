import Phaser from 'phaser';
import { BRANDING, SPONSORS } from '@/game/config/branding';
import { C, CSS, FONT } from '@/game/config/palette';
import { TUNING } from '@/game/config/tuning';
import { crtOverlay, makeButton, slam, ticker } from '@/game/ui/Kit';
import { Portrait } from '@/game/render/Portrait';
import { JASSY } from '@/game/data/characters/jassy';
import { RAID } from '@/game/data/characters/raid';
import { FS } from '@/game/combat/states';
import { Save } from '@/game/save/SaveManager';
import { pick } from '@/game/utils/math';

const W = TUNING.view.width;
const H = TUNING.view.height;

export class MenuScene extends Phaser.Scene {
  private portraits: Portrait[] = [];

  constructor() { super('Menu'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0410');

    // backdrop: warehouse lighting rig + screen-print diagonals
    const bg = this.add.graphics();
    bg.fillStyle(0x1a0b20, 1);
    bg.fillRect(0, 0, W, H);
    for (let i = -3; i < 14; i++) {
      bg.fillStyle(i % 2 ? C.purple : C.pink, 0.07);
      bg.beginPath();
      bg.moveTo(i * 96, 0);
      bg.lineTo(i * 96 + 46, 0);
      bg.lineTo(i * 96 - 74, H);
      bg.lineTo(i * 96 - 120, H);
      bg.closePath();
      bg.fillPath();
    }
    // two hanging lamps washing the flanking wrestlers
    for (const lx of [128, W - 118]) {
      bg.fillStyle(C.orange, 0.09);
      bg.beginPath();
      bg.moveTo(lx - 14, 0);
      bg.lineTo(lx + 14, 0);
      bg.lineTo(lx + 150, H);
      bg.lineTo(lx - 150, H);
      bg.closePath();
      bg.fillPath();
    }
    bg.fillStyle(C.ink, 0.5);
    bg.fillRect(0, 0, W, H);
    bg.fillStyle(0x000000, 0.35);
    bg.fillRect(W / 2 - 240, 150, 480, 300);

    // flanking wrestlers
    const p1 = new Portrait(this, JASSY, 132, 468, 1.12, 1);
    p1.setPose(FS.IDLE);
    const p2 = new Portrait(this, RAID, W - 124, 468, 1.12, -1);
    p2.setPose(FS.IDLE);
    this.portraits.push(p1, p2);

    slam(this, W / 2 - 92, 62, BRANDING.titleLine1, 54, CSS.pink, -5);
    slam(this, W / 2 + 84, 100, BRANDING.titleLine2, 54, CSS.acid, -5);
    this.add.text(W / 2, 142, BRANDING.subtitle, {
      fontFamily: FONT.slam, fontSize: '19px', color: CSS.white,
    }).setOrigin(0.5);

    const save = Save.get();
    const rec = `${save.totalWins}W / ${Math.max(0, save.totalMatches - save.totalWins)}L`;

    const bx = W / 2;
    let by = 194;
    const gap = 64;
    makeButton(this, bx, by, 'QUICK MATCH', () => this.go('Select', { mode: 'quick' }),
      { w: 300, h: 54, color: C.pink, sub: 'JASSY vs RAID — FIGHT NOW' });
    by += gap;
    makeButton(this, bx, by, 'CHOKE HOLE ARCHIVES', () => this.go('Archive'),
      { w: 300, h: 50, color: C.gold, size: 20, sub: 'REAL VENUES / REAL HISTORY' });
    by += gap - 4;
    makeButton(this, bx, by, 'ROSTER', () => this.go('Roster'),
      { w: 300, h: 50, color: C.cyan, size: 20, sub: `YOUR RECORD: ${rec}` });
    by += gap - 4;
    makeButton(this, bx - 78, by, 'HOW TO PLAY', () => this.go('HowTo'),
      { w: 144, h: 46, color: C.acid, size: 15 });
    makeButton(this, bx + 78, by, 'SETTINGS', () => this.go('Settings'),
      { w: 144, h: 46, color: C.steel, size: 15 });

    const s = pick(SPONSORS);
    ticker(this, H - 14, `${BRANDING.network} // ${s.name}: ${s.line} // ${BRANDING.buildLabel}`);

    crtOverlay(this);
    this.cameras.main.fadeIn(240, 0, 0, 0);
  }

  private go(scene: string, data?: object): void {
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(scene, data);
    });
  }

  override update(_t: number, dt: number): void {
    for (const p of this.portraits) p.update(dt);
  }
}
