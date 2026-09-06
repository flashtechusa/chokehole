import Phaser from 'phaser';
import type { ArenaConfig, BackdropLayer } from '@/game/types';
import { TUNING } from '@/game/config/tuning';
import { mulberry32, seedFromString } from '@/game/utils/rng';
import { shade } from '@/game/utils/math';
import { C, FONT } from '@/game/config/palette';
import { SPONSORS } from '@/game/config/branding';
import { fs, fsn } from '@/game/config/type';

const W = TUNING.view.width;
const H = TUNING.view.height;

interface ParallaxLayer {
  container: Phaser.GameObjects.Container;
  parallax: number;
  kind: BackdropLayer['kind'];
  /** Per-frame animated bits. */
  animate?: (t: number, heat: number, cfg: ArenaLive) => void;
}

interface ArenaLive {
  heat: number;
  flickerSeed: number;
  eventActive: boolean;
  eventPower: number;
}

/**
 * Procedural arena: multi-layer parallax backdrop + a 2.5D ring.
 * Every layer is generated from the arena data file, so a new real Choke Hole
 * venue is a data change, not a renderer change.
 */
export class ArenaView {
  readonly back: Phaser.GameObjects.Container;
  readonly ringBack: Phaser.GameObjects.Container;
  readonly ringFront: Phaser.GameObjects.Container;
  private layers: ParallaxLayer[] = [];
  private scene: Phaser.Scene;
  private cfg: ArenaConfig;
  private live: ArenaLive = { heat: 0, flickerSeed: 0, eventActive: false, eventPower: 0 };
  private lightGfx: Phaser.GameObjects.Graphics;
  private hazeGfx: Phaser.GameObjects.Graphics;
  private t = 0;
  private reducedFx = false;
  /** Everything the world camera should draw. */
  readonly objects: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene, cfg: ArenaConfig) {
    this.scene = scene;
    this.cfg = cfg;

    this.back = scene.add.container(0, 0).setDepth(10);
    this.ringBack = scene.add.container(0, 0).setDepth(120);
    this.ringFront = scene.add.container(0, 0).setDepth(400);

    this.buildSky();
    for (const l of cfg.backdrop) this.buildLayer(l);
    this.hazeGfx = scene.add.graphics().setDepth(115);
    this.lightGfx = scene.add.graphics().setDepth(410);
    this.buildRing();
    this.objects.push(this.back, this.ringBack, this.ringFront, this.hazeGfx, this.lightGfx);
  }

  setReducedFx(v: boolean): void { this.reducedFx = v; }

  /* ---------------------------------------------------------------- *
   * construction
   * ---------------------------------------------------------------- */

  private buildSky(): void {
    const g = this.scene.add.graphics();
    const p = this.cfg.palette;
    const steps = 24;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const col = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(p.skyTop),
        Phaser.Display.Color.ValueToColor(p.skyBottom),
        100, t * 100,
      );
      g.fillStyle(Phaser.Display.Color.GetColor(col.r, col.g, col.b), 1);
      g.fillRect(-200, (H / steps) * i, W + 400, H / steps + 2);
    }
    this.back.add(g);
  }

  private buildLayer(def: BackdropLayer): void {
    const c = this.scene.add.container(0, 0);
    const g = this.scene.add.graphics();
    c.add(g);
    const rnd = mulberry32(seedFromString(this.cfg.id + def.kind));
    const layer: ParallaxLayer = { container: c, parallax: def.parallax, kind: def.kind };

    switch (def.kind) {
      case 'brickwall': this.drawBrick(g, def, rnd); break;
      case 'gallerywall': this.drawGalleryWall(g, def, rnd); break;
      case 'skyline': this.drawSkyline(g, def, rnd); break;
      case 'graffiti': this.drawGraffiti(c, g, def, rnd); break;
      case 'rafters': this.drawRafters(g, def, rnd); break;
      case 'trussLights': this.drawTruss(c, g, def, rnd, layer); break;
      case 'banners': this.drawBanners(c, g, def, rnd); break;
      case 'billboards': this.drawBillboards(c, g, def, rnd, layer); break;
      case 'hotdog': this.drawHotdogRig(c, g, def, layer); break;
      case 'barricade': this.drawBarricade(g, def, rnd); break;
      case 'crowd': this.drawCrowd(g, def, rnd, layer); break;
      case 'projection': this.drawProjection(g, def, rnd, layer); break;
      case 'stagerig': this.drawRafters(g, def, rnd); break;
    }

    this.back.add(c);
    this.layers.push(layer);
  }

  private drawBrick(g: Phaser.GameObjects.Graphics, def: BackdropLayer, rnd: () => number): void {
    const h = def.height ?? 240;
    g.fillStyle(def.tint ?? 0x3a2436, 1);
    g.fillRect(-200, def.y, W + 400, h);
    const bw = 46, bh = 17;
    for (let y = def.y; y < def.y + h; y += bh) {
      const off = ((y / bh) % 2) * (bw / 2);
      for (let x = -200; x < W + 400; x += bw) {
        const v = rnd();
        g.fillStyle(v > 0.82 ? shade(def.tint ?? 0x3a2436, 0.12) : shade(def.tint ?? 0x3a2436, -0.08), 1);
        g.fillRect(x + off + 1, y + 1, bw - 3, bh - 3);
      }
    }
    g.fillStyle(def.tint2 ?? 0x241726, 0.55);
    g.fillRect(-200, def.y, W + 400, h * 0.28);
  }

  private drawGalleryWall(g: Phaser.GameObjects.Graphics, def: BackdropLayer, rnd: () => number): void {
    const h = def.height ?? 240;
    g.fillStyle(def.tint ?? 0x50405a, 1);
    g.fillRect(-200, def.y, W + 400, h);
    for (let i = 0; i < 40; i++) {
      const x = rnd() * (W + 400) - 200;
      const y = def.y + rnd() * h;
      g.fillStyle(shade(def.tint ?? 0x50405a, rnd() > 0.5 ? 0.1 : -0.14), 0.5);
      g.fillRect(x, y, 30 + rnd() * 90, 8 + rnd() * 40);
    }
    g.fillStyle(def.tint2 ?? 0x2b1f2e, 0.5);
    g.fillRect(-200, def.y, W + 400, h * 0.3);
  }

  private drawSkyline(g: Phaser.GameObjects.Graphics, def: BackdropLayer, rnd: () => number): void {
    const h = def.height ?? 210;
    let x = -200;
    while (x < W + 300) {
      const bw = 40 + rnd() * 90;
      const bh = 60 + rnd() * (h - 40);
      g.fillStyle(rnd() > 0.5 ? (def.tint ?? 0x2b3160) : (def.tint2 ?? 0x161a34), 1);
      g.fillRect(x, def.y + h - bh, bw, bh);
      for (let wy = def.y + h - bh + 8; wy < def.y + h - 6; wy += 12) {
        for (let wx = x + 6; wx < x + bw - 8; wx += 11) {
          if (rnd() > 0.55) {
            g.fillStyle(rnd() > 0.7 ? 0xffd23f : 0x9fb8ff, 0.5 + rnd() * 0.4);
            g.fillRect(wx, wy, 4, 5);
          }
        }
      }
      x += bw + 6;
    }
  }

  private drawGraffiti(
    c: Phaser.GameObjects.Container, g: Phaser.GameObjects.Graphics,
    def: BackdropLayer, rnd: () => number,
  ): void {
    const words = ['CHOKE HOLE', 'SQUELSH', 'NO HOLES BARRED', 'IBS', 'PAY THE RENT', 'BUGS RIGHTS'];
    const n = def.density ?? 4;
    for (let i = 0; i < n; i++) {
      const x = 30 + (W - 200) * (i / Math.max(1, n - 1)) + rnd() * 40;
      const y = def.y + rnd() * 46;
      const word = words[Math.floor(rnd() * words.length)]!;
      const col = rnd() > 0.5 ? (def.tint ?? C.pink) : (def.tint2 ?? C.acid);
      const txt = this.scene.add.text(x, y, word, {
        fontFamily: FONT.slam,
        fontSize: `${16 + Math.floor(rnd() * 16)}px`,
        color: `#${col.toString(16).padStart(6, '0')}`,
      }).setAlpha(0.18 + rnd() * 0.14).setAngle(-8 + rnd() * 16);
      c.add(txt);
    }
    g.setAlpha(0);
  }

  private drawRafters(g: Phaser.GameObjects.Graphics, def: BackdropLayer, rnd: () => number): void {
    const h = def.height ?? 120;
    g.fillStyle(def.tint ?? 0x2c1c2e, 1);
    g.fillRect(-200, def.y, W + 400, 16);
    for (let x = -160; x < W + 300; x += 84) {
      g.fillStyle(shade(def.tint ?? 0x2c1c2e, -0.2), 1);
      g.fillRect(x, def.y, 12, h * (0.5 + rnd() * 0.5));
      g.lineStyle(4, shade(def.tint ?? 0x2c1c2e, 0.14), 0.9);
      g.lineBetween(x, def.y + 16, x + 84, def.y + h * 0.55);
      g.lineBetween(x + 84, def.y + 16, x, def.y + h * 0.55);
    }
    // hanging cables
    for (let i = 0; i < 8; i++) {
      const x = rnd() * W;
      g.lineStyle(2, 0x110a12, 0.8);
      g.lineBetween(x, def.y + 12, x + (rnd() - 0.5) * 40, def.y + 40 + rnd() * 60);
    }
  }

  private drawTruss(
    c: Phaser.GameObjects.Container, g: Phaser.GameObjects.Graphics,
    def: BackdropLayer, rnd: () => number, layer: ParallaxLayer,
  ): void {
    const n = def.density ?? 6;
    const lamps: { x: number; y: number; col: number; gfx: Phaser.GameObjects.Graphics }[] = [];
    g.fillStyle(0x1a1119, 1);
    g.fillRect(-200, def.y, W + 400, 12);
    for (let i = 0; i < n; i++) {
      const x = (W / (n - 1)) * i;
      const col = i % 2 === 0 ? (def.tint ?? C.orange) : (def.tint2 ?? C.cyan);
      g.fillStyle(0x241726, 1);
      g.fillRect(x - 9, def.y + 10, 18, 14);
      const beam = this.scene.add.graphics();
      c.add(beam);
      lamps.push({ x, y: def.y + 24, col, gfx: beam });
      void rnd();
    }
    layer.animate = (t, heat, live): void => {
      for (let i = 0; i < lamps.length; i++) {
        const l = lamps[i]!;
        const flick = live.eventActive
          ? (Math.sin(t * 42 + i * 3.1) > 0.1 ? 1 : 0.15) * (0.4 + Math.random() * 0.6)
          : 1;
        const pulse = 0.35 + 0.3 * Math.sin(t * 2.2 + i) + heat * 0.4;
        l.gfx.clear();
        l.gfx.fillStyle(l.col, Math.max(0, 0.13 * pulse * flick));
        l.gfx.beginPath();
        l.gfx.moveTo(l.x - 10, l.y);
        l.gfx.lineTo(l.x + 10, l.y);
        l.gfx.lineTo(l.x + 150, H);
        l.gfx.lineTo(l.x - 150, H);
        l.gfx.closePath();
        l.gfx.fillPath();
        l.gfx.fillStyle(l.col, Math.max(0, 0.85 * flick));
        l.gfx.fillCircle(l.x, l.y - 2, 5);
      }
    };
  }

  private drawBanners(
    c: Phaser.GameObjects.Container, g: Phaser.GameObjects.Graphics,
    def: BackdropLayer, rnd: () => number,
  ): void {
    const n = def.density ?? 3;
    for (let i = 0; i < n; i++) {
      const x = 90 + (W - 180) * (i / Math.max(1, n - 1)) + (rnd() - 0.5) * 40;
      const w = 150, h = 74;
      const col = i % 2 === 0 ? (def.tint ?? C.pink) : (def.tint2 ?? C.gold);
      g.fillStyle(0x0d0710, 0.9);
      g.fillRect(x - w / 2, def.y, w, h);
      g.lineStyle(3, col, 0.9);
      g.strokeRect(x - w / 2, def.y, w, h);
      const s = SPONSORS[i % SPONSORS.length]!;
      const t1 = this.scene.add.text(x, def.y + 22, s.name, {
        fontFamily: FONT.slam, fontSize: fs(19),
        color: `#${col.toString(16).padStart(6, '0')}`,
      }).setOrigin(0.5).setAlpha(0.85);
      const t2 = this.scene.add.text(x, def.y + 48, s.line, {
        fontFamily: FONT.mono, fontSize: fs(8), color: '#f3e9dd',
        wordWrap: { width: w - 18 }, align: 'center',
      }).setOrigin(0.5).setAlpha(0.6);
      c.add([t1, t2]);
    }
  }

  private drawBillboards(
    c: Phaser.GameObjects.Container, g: Phaser.GameObjects.Graphics,
    def: BackdropLayer, rnd: () => number, layer: ParallaxLayer,
  ): void {
    const n = def.density ?? 5;
    const screens: { x: number; y: number; w: number; h: number; g: Phaser.GameObjects.Graphics }[] = [];
    for (let i = 0; i < n; i++) {
      const w = 90 + rnd() * 110;
      const h = 52 + rnd() * 60;
      const x = -120 + (W + 240) * (i / n) + rnd() * 40;
      const y = def.y + rnd() * 80;
      g.fillStyle(0x090a16, 1);
      g.fillRect(x, y, w, h);
      g.lineStyle(2, 0x4a5480, 1);
      g.strokeRect(x, y, w, h);
      const sg = this.scene.add.graphics();
      c.add(sg);
      screens.push({ x, y, w, h, g: sg });
      const s = SPONSORS[i % SPONSORS.length]!;
      const t = this.scene.add.text(x + w / 2, y + h / 2, s.name, {
        fontFamily: FONT.slam, fontSize: `${Math.round(Math.min(fsn(20), w / 7))}px`,
        color: i % 2 ? '#31e7ff' : '#ff2d95',
        align: 'center', wordWrap: { width: w - 10 },
      }).setOrigin(0.5).setAlpha(0.9);
      if (t.width > w - 8) t.setScale((w - 8) / t.width);
      c.add(t);
    }
    layer.animate = (t): void => {
      for (let i = 0; i < screens.length; i++) {
        const s = screens[i]!;
        s.g.clear();
        const scan = (Math.sin(t * 1.4 + i) * 0.5 + 0.5) * s.h;
        s.g.fillStyle(0xffffff, 0.06);
        s.g.fillRect(s.x, s.y + scan, s.w, 4);
      }
    };
  }

  /**
   * The colossal condiment rig. ORIGINAL stylised prop standing in for the real
   * Times Square sculpture until artwork clearance is confirmed.
   */
  private drawHotdogRig(
    c: Phaser.GameObjects.Container, g: Phaser.GameObjects.Graphics,
    def: BackdropLayer, layer: ParallaxLayer,
  ): void {
    const rig = this.scene.add.container(W * 0.68, def.y + 196);
    const body = this.scene.add.graphics();
    // stand
    body.fillStyle(0x2a2e4a, 1);
    body.fillRect(-16, 40, 32, 190);
    body.fillStyle(0x1c2038, 1);
    body.fillRect(-46, 218, 92, 16);
    // bun + frank, tilted like a launch rig
    body.fillStyle(def.tint2 ?? C.gold, 1);
    body.fillRoundedRect(-130, -6, 260, 46, 22);
    body.fillStyle(def.tint ?? C.blood, 1);
    body.fillRoundedRect(-140, -22, 280, 34, 17);
    body.fillStyle(0xf6e27a, 1);
    for (let i = -120; i < 130; i += 26) {
      body.fillCircle(i, -12 + Math.sin(i * 0.06) * 6, 5);
    }
    body.lineStyle(3, 0x140a1c, 0.55);
    body.strokeRoundedRect(-140, -22, 280, 34, 17);
    rig.add(body);
    rig.setScale(0.86);
    c.add(rig);

    const baseY = def.y + 196;
    layer.animate = (t, heat, live): void => {
      const lift = live.eventPower * 92;
      rig.y = baseY - lift + Math.sin(t * 1.4) * 2;
      rig.setAngle(Math.sin(t * 0.8) * 1.5 * (0.3 + heat));
    };
    g.setAlpha(0);
  }

  private drawBarricade(g: Phaser.GameObjects.Graphics, def: BackdropLayer, rnd: () => number): void {
    const n = def.density ?? 18;
    for (let i = 0; i < n; i++) {
      const x = -60 + (W + 120) * (i / n);
      g.fillStyle(def.tint ?? 0x3a4064, 1);
      g.fillRect(x, def.y, 44, 26);
      g.fillStyle(def.tint2 ?? C.gold, 0.8);
      g.fillRect(x, def.y + 8, 44, 5);
      g.fillStyle(shade(def.tint ?? 0x3a4064, -0.3), 1);
      g.fillRect(x + 2, def.y + 26, 5, 14);
      g.fillRect(x + 37, def.y + 26, 5, 14);
      void rnd();
    }
  }

  private drawCrowd(
    g: Phaser.GameObjects.Graphics, def: BackdropLayer, rnd: () => number, layer: ParallaxLayer,
  ): void {
    const n = def.density ?? 36;
    const heads: { x: number; y: number; r: number; col: number; ph: number }[] = [];
    for (let i = 0; i < n; i++) {
      const x = -80 + rnd() * (W + 160);
      const row = Math.floor(rnd() * 3);
      const y = def.y + row * 15 + rnd() * 8;
      const r = 9 + rnd() * 5 - row * 1.4;
      heads.push({ x, y, r, col: rnd() > 0.85 ? (def.tint2 ?? C.pink) : (def.tint ?? 0x1b1020), ph: rnd() * 6.28 });
    }
    heads.sort((a, b) => a.y - b.y);
    const glow = def.tint2 ?? C.pink;
    layer.animate = (t, heat): void => {
      g.clear();
      const bob = 1 + heat * 3.4;
      // backlight band so the crowd reads as bodies, not noise
      g.fillStyle(glow, 0.1 + heat * 0.16);
      g.fillRect(-100, def.y - 16, W + 200, 40);
      for (const h of heads) {
        const y = h.y + Math.sin(t * (2.4 + heat * 4) + h.ph) * bob;
        g.fillStyle(h.col, 1);
        g.fillCircle(h.x, y, h.r + 1.6);
        g.fillRect(h.x - h.r - 1.6, y + h.r * 0.6, h.r * 2 + 3.2, 28);
        // rim light picks the silhouette off the wall
        g.lineStyle(2, glow, 0.5 + heat * 0.4);
        g.beginPath();
        g.arc(h.x, y, h.r + 1.6, Math.PI * 1.05, Math.PI * 1.95, false);
        g.strokePath();
      }
      // arms up when the crowd is hot
      if (heat > 0.45) {
        g.lineStyle(3, shade(def.tint2 ?? C.pink, -0.1), Math.min(0.7, (heat - 0.45) * 1.6));
        for (const h of heads) {
          if ((h.ph * 100) % 3 > 1.6) continue;
          const y = h.y + Math.sin(t * 5 + h.ph) * bob;
          g.lineBetween(h.x - 6, y, h.x - 12, y - 20 - Math.sin(t * 7 + h.ph) * 5);
          g.lineBetween(h.x + 6, y, h.x + 12, y - 20 - Math.cos(t * 7 + h.ph) * 5);
        }
      }
    };
  }

  private drawProjection(
    g: Phaser.GameObjects.Graphics, def: BackdropLayer, rnd: () => number, layer: ParallaxLayer,
  ): void {
    void rnd;
    layer.animate = (t, heat): void => {
      g.clear();
      g.fillStyle(def.tint ?? C.purple, 0.16 + heat * 0.12);
      for (let i = 0; i < 6; i++) {
        const y = def.y + ((t * 26 + i * 40) % 240);
        g.fillRect(-100, y, W + 200, 14);
      }
    };
  }

  /* ---------------------------------------------------------------- *
   * the ring
   * ---------------------------------------------------------------- */

  private buildRing(): void {
    const p = this.cfg.palette;
    const cx = TUNING.ring.centerX;
    const hw = this.cfg.ringHalfWidth;
    const backY = TUNING.ring.baseY - 26;
    const frontY = TUNING.ring.baseY + this.cfg.ringDepth + 30;
    const bhw = hw * 0.92;
    const fhw = hw * 1.1;

    const g = this.scene.add.graphics();

    // floor under/around the ring
    g.fillStyle(p.floor, 1);
    g.fillRect(-200, backY - 6, W + 400, H - backY + 40);

    // apron skirt
    g.fillStyle(p.apron, 1);
    g.beginPath();
    g.moveTo(cx - fhw, frontY);
    g.lineTo(cx + fhw, frontY);
    g.lineTo(cx + fhw + 16, frontY + 54);
    g.lineTo(cx - fhw - 16, frontY + 54);
    g.closePath();
    g.fillPath();
    g.fillStyle(shade(p.apron, -0.3), 1);
    g.fillRect(cx - fhw - 16, frontY + 40, fhw * 2 + 32, 14);

    // canvas
    g.fillStyle(p.matCanvas, 1);
    g.beginPath();
    g.moveTo(cx - bhw, backY);
    g.lineTo(cx + bhw, backY);
    g.lineTo(cx + fhw, frontY);
    g.lineTo(cx - fhw, frontY);
    g.closePath();
    g.fillPath();

    // canvas grime + logo
    g.fillStyle(shade(p.matCanvas, -0.16), 0.5);
    g.beginPath();
    g.moveTo(cx - bhw, backY);
    g.lineTo(cx + bhw, backY);
    g.lineTo(cx + fhw * 0.98, backY + 26);
    g.lineTo(cx - fhw * 0.98, backY + 26);
    g.closePath();
    g.fillPath();

    this.ringBack.add(g);

    const logo = this.scene.add.text(cx, TUNING.ring.baseY + this.cfg.ringDepth * 0.42, 'CHOKE HOLE', {
      fontFamily: FONT.slam, fontSize: fs(46),
      color: `#${p.matLogo.toString(16).padStart(6, '0')}`,
    }).setOrigin(0.5).setAlpha(0.22).setScale(1, 0.42);
    this.ringBack.add(logo);

    const sub = this.scene.add.text(cx, TUNING.ring.baseY + this.cfg.ringDepth * 0.72, 'SQUELSH', {
      fontFamily: FONT.slam, fontSize: fs(20), color: '#000000',
    }).setOrigin(0.5).setAlpha(0.12).setScale(1, 0.45);
    this.ringBack.add(sub);

    // --- back ropes + posts (behind fighters) ---
    const rb = this.scene.add.graphics();
    this.rope(rb, cx - bhw, backY, cx + bhw, backY, p, -1);
    this.post(rb, cx - bhw, backY, p, 0.82);
    this.post(rb, cx + bhw, backY, p, 0.82);
    this.ringBack.add(rb);

    // --- front ropes + posts (in front of fighters) ---
    const rf = this.scene.add.graphics();
    this.rope(rf, cx - fhw, frontY, cx + fhw, frontY, p, 1);
    // side ropes running from the back corner posts to the front ones
    for (let i = 0; i < 3; i++) {
      rf.lineStyle(4, p.ropes[i] ?? p.ropes[0], 0.85);
      rf.lineBetween(
        cx - bhw, backY - 18 - i * 22,
        cx - fhw, frontY - 20 - i * 26,
      );
      rf.lineBetween(
        cx + bhw, backY - 18 - i * 22,
        cx + fhw, frontY - 20 - i * 26,
      );
    }
    this.post(rf, cx - fhw, frontY, p, 1.05);
    this.post(rf, cx + fhw, frontY, p, 1.05);
    this.ringFront.add(rf);
  }

  private rope(
    g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number,
    p: ArenaConfig['palette'], dirSign: number,
  ): void {
    for (let i = 0; i < 3; i++) {
      const off = -20 - i * (dirSign > 0 ? 26 : 22);
      g.lineStyle(dirSign > 0 ? 6 : 5, p.ropes[i] ?? p.ropes[0], dirSign > 0 ? 0.95 : 0.8);
      g.lineBetween(x1, y1 + off, x2, y2 + off);
      g.lineStyle(1.5, 0x000000, 0.35);
      g.lineBetween(x1, y1 + off + 3, x2, y2 + off + 3);
    }
  }

  private post(
    g: Phaser.GameObjects.Graphics, x: number, y: number,
    p: ArenaConfig['palette'], s: number,
  ): void {
    g.fillStyle(0x120a14, 1);
    g.fillRect(x - 8 * s, y - 96 * s, 16 * s, 100 * s);
    g.fillStyle(p.posts, 1);
    g.fillRect(x - 6 * s, y - 94 * s, 12 * s, 96 * s);
    g.fillStyle(shade(p.posts, -0.35), 1);
    g.fillRect(x - 6 * s, y - 94 * s, 4 * s, 96 * s);
    g.fillStyle(0xffffff, 0.22);
    g.fillRect(x - 6 * s, y - 94 * s, 12 * s, 8 * s);
  }

  /* ---------------------------------------------------------------- *
   * per-frame
   * ---------------------------------------------------------------- */

  update(dtMs: number, scrollX: number, heat01: number, eventActive: boolean): void {
    this.t += dtMs / 1000;
    this.live.heat = heat01;
    this.live.eventActive = eventActive && !this.reducedFx;
    const target = eventActive ? 1 : 0;
    this.live.eventPower += (target - this.live.eventPower) * Math.min(1, dtMs / 420);

    for (const l of this.layers) {
      l.container.x = -scrollX * l.parallax;
      if (l.animate) l.animate(this.t, heat01, this.live);
    }

    // arena haze + heat light wash
    const p = this.cfg.palette;
    this.hazeGfx.clear();
    if (!this.reducedFx) {
      this.hazeGfx.fillStyle(p.haze, 0.035 + heat01 * 0.05);
      this.hazeGfx.fillRect(0, 150, W, H - 150);
    }

    this.lightGfx.clear();
    if (!this.reducedFx && heat01 > 0.02) {
      const a = 0.022 + heat01 * 0.05;
      this.lightGfx.fillStyle(p.lightWarm, a * (0.6 + 0.4 * Math.sin(this.t * 3)));
      this.lightGfx.fillRect(0, 0, W, H);
    }
  }

  /** Crowd-press mechanic: shrinks the usable ring width. */
  ringHalfWidthFor(heat01: number): number {
    if (this.cfg.event.kind !== 'crowdPress') return this.cfg.ringHalfWidth;
    return this.cfg.ringHalfWidth * (1 - 0.09 * heat01);
  }

  destroy(): void {
    this.back.destroy(true);
    this.ringBack.destroy(true);
    this.ringFront.destroy(true);
    this.hazeGfx.destroy();
    this.lightGfx.destroy();
  }
}
