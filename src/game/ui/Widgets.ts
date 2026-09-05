import Phaser from 'phaser';
import { C, CSS, FONT } from '@/game/config/palette';
import { Audio } from '@/game/audio/AudioManager';
import { clamp } from '@/game/utils/math';
import { TUNING } from '@/game/config/tuning';

/** Touch-friendly horizontal slider (48px+ grab area). */
export function makeSlider(
  scene: Phaser.Scene, x: number, y: number, w: number,
  label: string, value: number, onChange: (v: number) => void,
  format: (v: number) => string = (v) => `${Math.round(v * 100)}%`,
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const lab = scene.add.text(0, -20, label, {
    fontFamily: FONT.mono, fontSize: '11px', color: CSS.bone,
  });
  const val = scene.add.text(w, -20, format(value), {
    fontFamily: FONT.slam, fontSize: '13px', color: CSS.acid,
  }).setOrigin(1, 0);
  c.add([g, lab, val]);

  let v = value;
  const draw = (): void => {
    g.clear();
    g.fillStyle(0x2a1b30, 1);
    g.fillRect(0, -3, w, 8);
    g.fillStyle(C.pink, 1);
    g.fillRect(0, -3, w * v, 8);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(w * v, 1, 11);
    g.lineStyle(2.5, C.acid, 1);
    g.strokeCircle(w * v, 1, 11);
  };
  draw();

  const zone = scene.add.zone(w / 2, 0, w + 40, 52).setOrigin(0.5).setInteractive({ draggable: true });
  c.add(zone);
  const apply = (px: number): void => {
    v = clamp(px / w, 0, 1);
    draw();
    val.setText(format(v));
    onChange(v);
  };
  zone.on('pointerdown', (p: Phaser.Input.Pointer) => apply(p.x - c.x));
  zone.on('drag', (p: Phaser.Input.Pointer) => apply(p.x - c.x));
  zone.on('pointerup', () => Audio.play('uiMove', 0.4));
  return c;
}

/** Two-state toggle chip. */
export function makeToggle(
  scene: Phaser.Scene, x: number, y: number, w: number,
  label: string, value: boolean, onChange: (v: boolean) => void,
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const lab = scene.add.text(0, -8, label, {
    fontFamily: FONT.mono, fontSize: '11px', color: CSS.bone,
  });
  const state = scene.add.text(w, -9, '', {
    fontFamily: FONT.slam, fontSize: '14px', color: CSS.acid,
  }).setOrigin(1, 0);
  c.add([g, lab, state]);

  let v = value;
  const draw = (): void => {
    g.clear();
    g.fillStyle(v ? C.acid : 0x3a2b40, 0.28);
    g.fillRect(-8, -16, w + 16, 32);
    g.lineStyle(2, v ? C.acid : C.steel, 0.9);
    g.strokeRect(-8, -16, w + 16, 32);
    state.setText(v ? 'ON' : 'OFF').setColor(v ? CSS.acid : CSS.bone);
  };
  draw();

  const zone = scene.add.zone(w / 2, 0, w + 40, 46).setOrigin(0.5).setInteractive({ useHandCursor: true });
  c.add(zone);
  zone.on('pointerup', () => {
    v = !v;
    draw();
    Audio.play('uiSelect', 0.5);
    onChange(v);
  });
  return c;
}

/**
 * Drag-to-scroll vertical list. Works with a thumb and with a mouse wheel;
 * never fights browser page scrolling because the canvas captures touches.
 */
export class ScrollList {
  readonly content: Phaser.GameObjects.Container;
  private viewTop: number;
  private viewHeight: number;
  private maxScroll = 0;
  private scroll = 0;
  private velocity = 0;
  private dragging = false;
  private lastY = 0;
  private bar: Phaser.GameObjects.Graphics;
  private barX: number;

  constructor(
    scene: Phaser.Scene, viewTop: number, viewHeight: number,
    barX: number = TUNING.view.width - 18,
  ) {
    this.viewTop = viewTop;
    this.viewHeight = viewHeight;
    this.barX = barX;
    this.content = scene.add.container(0, viewTop);
    // clip the list to its viewport so cards never bleed over the header or footer
    const maskShape = scene.make.graphics({});
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(0, viewTop, TUNING.view.width, viewHeight);
    this.content.setMask(maskShape.createGeometryMask());
    this.bar = scene.add.graphics().setDepth(760);

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    scene.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      this.scroll = clamp(this.scroll - dy * 0.6, -this.maxScroll, 0);
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
      scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
      scene.input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
      scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    });
  }

  setContentHeight(h: number): void {
    this.maxScroll = Math.max(0, h - this.viewHeight);
  }

  private inView(p: Phaser.Input.Pointer): boolean {
    return p.y >= this.viewTop && p.y <= this.viewTop + this.viewHeight;
  }

  private onDown(p: Phaser.Input.Pointer): void {
    if (!this.inView(p)) return;
    this.dragging = true;
    this.lastY = p.y;
    this.velocity = 0;
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (!this.dragging) return;
    const dy = p.y - this.lastY;
    this.lastY = p.y;
    this.scroll = clamp(this.scroll + dy, -this.maxScroll, 0);
    this.velocity = dy;
  }

  private onUp(): void { this.dragging = false; }

  update(): void {
    if (!this.dragging) {
      this.velocity *= 0.9;
      if (Math.abs(this.velocity) > 0.4) {
        this.scroll = clamp(this.scroll + this.velocity, -this.maxScroll, 0);
      }
    }
    this.content.y = this.viewTop + this.scroll;

    this.bar.clear();
    if (this.maxScroll <= 0) return;
    const trackH = this.viewHeight - 12;
    const thumbH = Math.max(30, trackH * (this.viewHeight / (this.viewHeight + this.maxScroll)));
    const t = -this.scroll / this.maxScroll;
    this.bar.fillStyle(0x2a1b30, 0.8);
    this.bar.fillRect(this.barX, this.viewTop + 6, 5, trackH);
    this.bar.fillStyle(C.pink, 0.9);
    this.bar.fillRect(this.barX, this.viewTop + 6 + (trackH - thumbH) * t, 5, thumbH);
  }
}
