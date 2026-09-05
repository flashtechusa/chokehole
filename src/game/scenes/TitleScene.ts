import Phaser from 'phaser';
import { BRANDING } from '@/game/config/branding';
import { C, CSS, FONT } from '@/game/config/palette';
import { TUNING } from '@/game/config/tuning';
import { Audio } from '@/game/audio/AudioManager';
import { crtOverlay, slam } from '@/game/ui/Kit';

const W = TUNING.view.width;
const H = TUNING.view.height;

/**
 * Cold open: dead channel -> "an intergalactic broadcast is interrupting your
 * device" -> the title slams in. One tap continues (and unlocks WebAudio,
 * which iOS only permits from a real gesture).
 */
export class TitleScene extends Phaser.Scene {
  private noise!: Phaser.GameObjects.Graphics;
  private t = 0;
  private phase: 'static' | 'interrupt' | 'title' = 'static';
  private started = false;

  constructor() { super('Title'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#05020a');
    this.noise = this.add.graphics().setDepth(2);

    const interrupt = this.add.text(W / 2, H / 2, BRANDING.interrupt, {
      fontFamily: FONT.mono, fontSize: '15px', color: CSS.acid,
      align: 'center', wordWrap: { width: 620 },
    }).setOrigin(0.5).setAlpha(0).setDepth(20);

    crtOverlay(this, 3);

    this.time.delayedCall(600, () => {
      this.phase = 'interrupt';
      this.tweens.add({ targets: interrupt, alpha: 1, duration: 200 });
      Audio.play('static', 0.6);
    });

    this.time.delayedCall(1900, () => {
      this.phase = 'title';
      interrupt.destroy();
      this.buildTitle();
    });

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.go, this);
    this.input.keyboard?.on('keydown', this.go, this);
  }

  private buildTitle(): void {
    Audio.unlock();
    Audio.play('bell', 0.9);
    Audio.play('crowdPop', 0.8);

    const l1 = slam(this, W / 2 - 150, 150, BRANDING.titleLine1, 96, CSS.pink, -6).setDepth(10);
    const l2 = slam(this, W / 2 + 130, 232, BRANDING.titleLine2, 96, CSS.acid, -6).setDepth(10);
    l1.setScale(4).setAlpha(0);
    l2.setScale(4).setAlpha(0);
    this.tweens.add({ targets: l1, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
    this.tweens.add({ targets: l2, scale: 1, alpha: 1, duration: 260, delay: 130, ease: 'Back.easeOut' });

    const bar = this.add.graphics().setDepth(9);
    bar.fillStyle(C.ink, 0.9);
    bar.fillRect(0, 286, W, 46);
    bar.fillStyle(C.pink, 0.85);
    bar.fillRect(0, 286, W, 3);
    bar.fillRect(0, 329, W, 3);
    bar.setAlpha(0);
    this.tweens.add({ targets: bar, alpha: 1, duration: 200, delay: 320 });

    const sub = this.add.text(W / 2, 309, BRANDING.subtitle, {
      fontFamily: FONT.slam, fontSize: '30px', color: CSS.white,
    }).setOrigin(0.5).setDepth(11).setAlpha(0);
    this.tweens.add({ targets: sub, alpha: 1, duration: 200, delay: 380 });

    const tag = this.add.text(W / 2, 356, BRANDING.tagline, {
      fontFamily: FONT.mono, fontSize: '13px', color: CSS.acid,
    }).setOrigin(0.5).setDepth(11).setAlpha(0);
    this.tweens.add({ targets: tag, alpha: 0.9, duration: 300, delay: 520 });

    const tap = this.add.text(W / 2, 442, 'TAP TO ENTER THE BROADCAST', {
      fontFamily: FONT.slam, fontSize: '20px', color: CSS.gold,
    }).setOrigin(0.5).setDepth(11).setAlpha(0);
    this.tweens.add({ targets: tap, alpha: 1, duration: 260, delay: 700 });
    this.tweens.add({
      targets: tap, alpha: 0.35, duration: 620, delay: 1000,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    this.add.text(W / 2, 508, BRANDING.buildLabel, {
      fontFamily: FONT.mono, fontSize: '9px', color: CSS.bone,
    }).setOrigin(0.5).setAlpha(0.45).setDepth(11);

    this.started = true;
  }

  private go(): void {
    Audio.unlock();
    if (!this.started) {
      // impatient players skip straight to the title lockup
      this.time.removeAllEvents();
      this.children.getAll().forEach((o) => {
        if (o !== this.noise) o.destroy();
      });
      this.phase = 'title';
      this.buildTitle();
      return;
    }
    Audio.unlock();
    Audio.play('uiSelect');
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Menu');
    });
  }

  override update(_time: number, delta: number): void {
    this.t += delta / 1000;
    const g = this.noise;
    g.clear();
    const density = this.phase === 'title' ? 26 : 150;
    const alpha = this.phase === 'title' ? 0.12 : 0.5;
    for (let i = 0; i < density; i++) {
      const y = Math.random() * H;
      const h = 1 + Math.random() * (this.phase === 'title' ? 3 : 9);
      g.fillStyle(Math.random() > 0.6 ? C.pink : Math.random() > 0.5 ? C.cyan : 0xffffff,
        Math.random() * alpha);
      g.fillRect(0, y, W, h);
    }
    if (this.phase !== 'title') {
      g.fillStyle(0xffffff, 0.04);
      g.fillRect(0, (this.t * 260) % H, W, 40);
    }
  }
}
