import Phaser from 'phaser';
import { C, CSS, FONT } from '@/game/config/palette';
import { TUNING } from '@/game/config/tuning';
import { Audio } from '@/game/audio/AudioManager';

export interface ButtonOpts {
  w?: number;
  h?: number;
  color?: number;
  textColor?: string;
  sub?: string;
  size?: number;
  disabled?: boolean;
  skew?: number;
}

export interface Button {
  container: Phaser.GameObjects.Container;
  setEnabled(v: boolean): void;
  setLabel(s: string): void;
  setSub(s: string): void;
}

/**
 * Chunky wrestling-broadcast button. Minimum 48 CSS px tall at phone scale and
 * hit-tested on a rectangle so thumbs never miss.
 */
export function makeButton(
  scene: Phaser.Scene, x: number, y: number, label: string,
  onClick: () => void, opts: ButtonOpts = {},
): Button {
  const w = opts.w ?? 260;
  const h = opts.h ?? 62;
  const color = opts.color ?? C.pink;
  const skew = opts.skew ?? 10;
  let enabled = !opts.disabled;

  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const txt = scene.add.text(0, opts.sub ? -8 : 0, label, {
    fontFamily: FONT.slam,
    fontSize: `${opts.size ?? 24}px`,
    color: opts.textColor ?? '#ffffff',
  }).setOrigin(0.5);
  const sub = scene.add.text(0, 16, opts.sub ?? '', {
    fontFamily: FONT.mono, fontSize: '10px', color: CSS.bone,
  }).setOrigin(0.5).setAlpha(0.75);
  c.add([g, txt, sub]);

  let hover = 0;
  const draw = (): void => {
    g.clear();
    const a = enabled ? 1 : 0.35;
    // hard shadow slab
    g.fillStyle(0x000000, 0.5 * a);
    g.fillPoints([
      new Phaser.Geom.Point(-w / 2 + skew + 6, -h / 2 + 6),
      new Phaser.Geom.Point(w / 2 + 6, -h / 2 + 6),
      new Phaser.Geom.Point(w / 2 - skew + 6, h / 2 + 6),
      new Phaser.Geom.Point(-w / 2 + 6, h / 2 + 6),
    ], true, true);
    g.fillStyle(color, (0.24 + hover * 0.5) * a);
    g.fillPoints([
      new Phaser.Geom.Point(-w / 2 + skew, -h / 2),
      new Phaser.Geom.Point(w / 2, -h / 2),
      new Phaser.Geom.Point(w / 2 - skew, h / 2),
      new Phaser.Geom.Point(-w / 2, h / 2),
    ], true, true);
    g.lineStyle(3.5, color, a);
    g.strokePoints([
      new Phaser.Geom.Point(-w / 2 + skew, -h / 2),
      new Phaser.Geom.Point(w / 2, -h / 2),
      new Phaser.Geom.Point(w / 2 - skew, h / 2),
      new Phaser.Geom.Point(-w / 2, h / 2),
    ], true, true);
    txt.setAlpha(a);
    sub.setAlpha(0.75 * a);
  };
  draw();

  const zone = scene.add.zone(0, 0, w + 16, h + 16).setOrigin(0.5).setInteractive({ useHandCursor: true });
  c.add(zone);

  zone.on('pointerover', () => { if (!enabled) return; hover = 1; draw(); Audio.play('uiMove', 0.5); });
  zone.on('pointerout', () => { hover = 0; draw(); });
  zone.on('pointerdown', () => {
    if (!enabled) return;
    hover = 1; draw();
    scene.tweens.add({ targets: c, scale: 0.95, duration: 60, yoyo: true });
  });
  zone.on('pointerup', () => {
    if (!enabled) return;
    Audio.play('uiSelect');
    onClick();
  });

  return {
    container: c,
    setEnabled(v: boolean): void { enabled = v; draw(); },
    setLabel(s: string): void { txt.setText(s); },
    setSub(s: string): void { sub.setText(s); },
  };
}

/** Slanted broadcast panel. */
export function panel(
  scene: Phaser.Scene, x: number, y: number, w: number, h: number,
  color: number = C.pink, fillAlpha = 0.16,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(0x0d0612, 0.86);
  g.fillRect(x, y, w, h);
  g.fillStyle(color, fillAlpha);
  g.fillRect(x, y, w, h);
  g.lineStyle(3, color, 0.9);
  g.strokeRect(x, y, w, h);
  g.fillStyle(color, 0.9);
  g.fillRect(x, y, 46, 4);
  g.fillRect(x + w - 46, y + h - 4, 46, 4);
  return g;
}

/** Big stencilled headline with a hard offset shadow. */
export function slam(
  scene: Phaser.Scene, x: number, y: number, text: string,
  size = 46, color: string = CSS.white, angle = -3,
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const shadow = scene.add.text(4, 5, text, {
    fontFamily: FONT.slam, fontSize: `${size}px`, color: '#120a1a',
  }).setOrigin(0.5);
  const main = scene.add.text(0, 0, text, {
    fontFamily: FONT.slam, fontSize: `${size}px`, color,
  }).setOrigin(0.5);
  c.add([shadow, main]);
  c.setAngle(angle);
  return c;
}

/** Scrolling ticker strip used on menus. */
export function ticker(
  scene: Phaser.Scene, y: number, text: string, color: number = C.acid, speed = 40,
): Phaser.GameObjects.Container {
  const c = scene.add.container(0, y);
  const g = scene.add.graphics();
  g.fillStyle(0x0d0612, 0.9);
  g.fillRect(0, -12, TUNING.view.width, 24);
  g.fillStyle(color, 0.25);
  g.fillRect(0, -12, TUNING.view.width, 2);
  g.fillRect(0, 10, TUNING.view.width, 2);
  c.add(g);
  const line = `${text}   ///   `;
  const t = scene.add.text(0, 0, line.repeat(6), {
    fontFamily: FONT.mono, fontSize: '11px',
    color: `#${color.toString(16).padStart(6, '0')}`,
  }).setOrigin(0, 0.5);
  c.add(t);
  scene.events.on(Phaser.Scenes.Events.UPDATE, (_t: number, dt: number) => {
    t.x -= (speed * dt) / 1000;
    if (t.x < -t.width / 6) t.x = 0;
  });
  return c;
}

/** Fullscreen CRT vignette + scanlines for menu scenes. */
export function crtOverlay(scene: Phaser.Scene, depth = 700): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(depth).setScrollFactor(0);
  const redraw = (): void => {
    g.clear();
    const w = TUNING.view.width;
    const h = TUNING.view.height;
    g.fillStyle(0x000000, 0.16);
    for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
    for (let i = 0; i < 5; i++) {
      g.fillStyle(0x000000, 0.06);
      g.fillRect(0, 0, w, 8 + i * 6);
      g.fillRect(0, h - (8 + i * 6), w, 8 + i * 6);
    }
  };
  redraw();
  return g;
}

/**
 * Menus authored against the 960-wide reference layout are re-centred on wider
 * phone aspect ratios by reparenting everything created so far into one offset
 * container. Call it after the scene's content is built and before any
 * full-bleed overlay (crtOverlay).
 */
export function centerLegacyLayout(scene: Phaser.Scene, designWidth = 960): void {
  const off = (TUNING.view.width - designWidth) / 2;
  if (off <= 0.5) return;
  const items = scene.children.list.slice();
  const root = scene.add.container(off, 0);
  root.add(items);
}
