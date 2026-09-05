import Phaser from 'phaser';
import { C, FONT } from '@/game/config/palette';
import { readSafeArea } from '@/game/utils/safeArea';
import { clamp } from '@/game/utils/math';

export interface PadState {
  moveX: number;
  moveY: number;
  strike: boolean;
  grapple: boolean;
  special: boolean;
}

interface Btn {
  key: 'strike' | 'grapple' | 'special';
  cx: number;
  cy: number;
  r: number;
  fill: number;
  label: string;
  sub: string;
  gfx: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
  subText: Phaser.GameObjects.Text;
  pointerId: number;
  pressT: number;
}

/**
 * Thumb layout: floating stick anywhere in the left zone, three big buttons
 * bottom-right. Targets are ~63 CSS px on an iPhone-class viewport, clear of
 * the home indicator, and never require a swipe that fights Safari gestures.
 */
export class TouchControls {
  private scene: Phaser.Scene;
  /** Root container — assign to the UI camera so match-camera zoom never scales the pad. */
  readonly root: Phaser.GameObjects.Container;
  private stickBase: Phaser.GameObjects.Graphics;
  private stickKnob: Phaser.GameObjects.Graphics;
  private buttons: Btn[] = [];

  private stickPointer = -1;
  private stickOrigin = new Phaser.Math.Vector2();
  private stickVec = new Phaser.Math.Vector2();
  private homeX = 0;
  private homeY = 0;
  private readonly stickRadius = 62;

  private opacity = 0.8;
  private uiScale = 1;
  private enabled = true;
  /** Suppressed while a touch-driven UI overlay (pause menu) is open. */
  private frozen = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setDepth(900).setScrollFactor(0);
    this.stickBase = scene.add.graphics();
    this.stickKnob = scene.add.graphics();
    this.root.add([this.stickBase, this.stickKnob]);

    this.makeButton('strike', 'STRIKE', 'TAP / HOLD', C.pink);
    this.makeButton('grapple', 'GRAPPLE', 'THROW / PIN', C.cyan);
    this.makeButton('special', 'SQUELSH', 'SPECIAL', C.acid);

    scene.input.addPointer(3);
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);

    this.layout();
  }

  private makeButton(key: Btn['key'], label: string, sub: string, fill: number): void {
    const gfx = this.scene.add.graphics();
    const text = this.scene.add
      .text(0, 0, label, { fontFamily: FONT.slam, fontSize: '17px', color: '#ffffff' })
      .setOrigin(0.5);
    const subText = this.scene.add
      .text(0, 0, sub, { fontFamily: FONT.mono, fontSize: '9px', color: '#ffffff' })
      .setOrigin(0.5)
      .setAlpha(0.65);
    this.root.add([gfx, text, subText]);
    this.buttons.push({
      key, cx: 0, cy: 0, r: 46, fill, label, sub, gfx, text, subText,
      pointerId: -1, pressT: 0,
    });
  }

  setOpacity(v: number): void { this.opacity = clamp(v, 0.25, 1); this.redraw(); }
  setUiScale(v: number): void { this.uiScale = clamp(v, 0.8, 1.35); this.layout(); }
  setEnabled(v: boolean): void {
    this.enabled = v;
    this.root.setVisible(v);
    if (!v) this.releaseAll();
  }
  setFrozen(v: boolean): void { this.frozen = v; if (v) this.releaseAll(); }

  private releaseAll(): void {
    this.stickPointer = -1;
    this.stickVec.set(0, 0);
    for (const b of this.buttons) b.pointerId = -1;
    this.redraw();
  }

  /** Layout in virtual (design-resolution) pixels, corrected for safe areas. */
  private layout(): void {
    const cam = this.scene.cameras.main;
    const W = cam.width;
    const H = cam.height;
    const inset = readSafeArea();
    // CSS px -> virtual px. displayScale is gameSize / displaySize.
    const s = this.scene.scale.displayScale.x || 1;
    const right = inset.right * s;
    const bottom = inset.bottom * s;
    const left = inset.left * s;

    const r = 46 * this.uiScale;
    const pad = 18 * this.uiScale;
    const baseX = W - (right + pad + r + 8);
    const baseY = H - (bottom + pad + r + 6);

    // Cluster: SQUELSH above, GRAPPLE left, STRIKE bottom-right (thumb arc).
    const positions: Record<Btn['key'], [number, number]> = {
      strike: [baseX, baseY],
      grapple: [baseX - (r * 2 + 12), baseY - r * 0.32],
      special: [baseX - r * 0.9, baseY - (r * 1.85)],
    };
    for (const b of this.buttons) {
      const [x, y] = positions[b.key];
      b.cx = x; b.cy = y; b.r = r;
      b.text.setPosition(x, y - 5).setFontSize(`${Math.round(16 * this.uiScale)}px`);
      b.subText.setPosition(x, y + 12).setFontSize(`${Math.round(9 * this.uiScale)}px`);
    }

    this.homeX = left + 96 * this.uiScale;
    this.homeY = H - (bottom + 96 * this.uiScale);
    if (this.stickPointer === -1) this.stickOrigin.set(this.homeX, this.homeY);
    this.redraw();
  }

  private hitButton(x: number, y: number): Btn | null {
    let best: Btn | null = null;
    let bestD = Infinity;
    for (const b of this.buttons) {
      const d = Phaser.Math.Distance.Between(x, y, b.cx, b.cy);
      // generous 1.22x touch slop, still non-overlapping in practice
      if (d < b.r * 1.22 && d < bestD) { best = b; bestD = d; }
    }
    return best;
  }

  private onDown(p: Phaser.Input.Pointer): void {
    if (!this.enabled || this.frozen) return;
    const b = this.hitButton(p.x, p.y);
    if (b) {
      b.pointerId = p.id;
      b.pressT = this.scene.time.now;
      this.redraw();
      return;
    }
    if (p.x < this.scene.cameras.main.width * 0.52 && this.stickPointer === -1) {
      this.stickPointer = p.id;
      this.stickOrigin.set(p.x, p.y);
      this.stickVec.set(0, 0);
      this.redraw();
    }
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (!this.enabled || this.frozen) return;
    if (p.id !== this.stickPointer) return;
    const dx = p.x - this.stickOrigin.x;
    const dy = p.y - this.stickOrigin.y;
    const len = Math.hypot(dx, dy);
    const max = this.stickRadius * this.uiScale;
    if (len > max) {
      // drag the origin along so the stick never runs out of travel
      this.stickOrigin.x += dx * (1 - max / len);
      this.stickOrigin.y += dy * (1 - max / len);
      this.stickVec.set((dx / len) * max, (dy / len) * max);
    } else {
      this.stickVec.set(dx, dy);
    }
    this.redraw();
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (p.id === this.stickPointer) {
      this.stickPointer = -1;
      this.stickVec.set(0, 0);
      this.stickOrigin.set(this.homeX, this.homeY);
    }
    for (const b of this.buttons) if (b.pointerId === p.id) b.pointerId = -1;
    this.redraw();
  }

  read(): PadState {
    const max = this.stickRadius * this.uiScale;
    const dead = 0.18;
    let mx = this.stickVec.x / max;
    let my = this.stickVec.y / max;
    const mag = Math.hypot(mx, my);
    if (mag < dead) { mx = 0; my = 0; }
    else {
      const scaled = (mag - dead) / (1 - dead);
      mx = (mx / mag) * scaled;
      my = (my / mag) * scaled;
    }
    return {
      moveX: clamp(mx, -1, 1),
      moveY: clamp(my, -1, 1),
      strike: this.buttons[0]!.pointerId !== -1,
      grapple: this.buttons[1]!.pointerId !== -1,
      special: this.buttons[2]!.pointerId !== -1,
    };
  }

  /** Highlights the SQUELSH button when a special is available. */
  setSpecialGlow(level: 0 | 1 | 2): void {
    const b = this.buttons[2]!;
    b.fill = level === 2 ? C.gold : level === 1 ? C.acid : 0x4a5a3a;
    b.subText.setText(level === 2 ? 'FINISHER!' : level === 1 ? 'SIGNATURE' : 'TAUNT');
    this.redraw();
  }

  private redraw(): void {
    const a = this.opacity;
    // stick
    this.stickBase.clear();
    const ox = this.stickPointer === -1 ? this.homeX : this.stickOrigin.x;
    const oy = this.stickPointer === -1 ? this.homeY : this.stickOrigin.y;
    const R = this.stickRadius * this.uiScale;
    this.stickBase.fillStyle(C.ink, 0.32 * a);
    this.stickBase.fillCircle(ox, oy, R);
    this.stickBase.lineStyle(3, C.pink, 0.75 * a);
    this.stickBase.strokeCircle(ox, oy, R);
    this.stickBase.lineStyle(1.5, C.pink, 0.3 * a);
    this.stickBase.strokeCircle(ox, oy, R * 0.55);

    this.stickKnob.clear();
    const kx = ox + this.stickVec.x;
    const ky = oy + this.stickVec.y;
    this.stickKnob.fillStyle(C.pink, 0.55 * a);
    this.stickKnob.fillCircle(kx, ky, R * 0.42);
    this.stickKnob.lineStyle(2.5, 0xffffff, 0.85 * a);
    this.stickKnob.strokeCircle(kx, ky, R * 0.42);

    for (const b of this.buttons) {
      const held = b.pointerId !== -1;
      b.gfx.clear();
      b.gfx.fillStyle(C.ink, (held ? 0.7 : 0.4) * a);
      b.gfx.fillCircle(b.cx, b.cy, b.r);
      b.gfx.fillStyle(b.fill, (held ? 0.62 : 0.24) * a);
      b.gfx.fillCircle(b.cx, b.cy, b.r * (held ? 0.94 : 0.86));
      b.gfx.lineStyle(held ? 5 : 3.5, b.fill, (held ? 1 : 0.9) * a);
      b.gfx.strokeCircle(b.cx, b.cy, b.r);
      b.text.setAlpha((held ? 1 : 0.92) * a);
      b.subText.setAlpha((held ? 0.9 : 0.6) * a);
    }
  }

  destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.root.destroy(true);
  }
}
