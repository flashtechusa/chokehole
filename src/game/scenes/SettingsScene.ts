import Phaser from 'phaser';
import { C, CSS, FONT } from '@/game/config/palette';
import { TUNING } from '@/game/config/tuning';
import { centerLegacyLayout, crtOverlay, makeButton, panel, slam } from '@/game/ui/Kit';
import { makeSlider, makeToggle } from '@/game/ui/Widgets';
import { Save } from '@/game/save/SaveManager';
import { Audio } from '@/game/audio/AudioManager';

const W = TUNING.view.width;
/** These columns are laid out against the 960-wide reference, then centred. */
const REF_W = 960;

export class SettingsScene extends Phaser.Scene {
  constructor() { super('Settings'); }

  create(): void {
    const s = Save.settings;
    this.cameras.main.setBackgroundColor('#0a0410');
    const bg = this.add.graphics();
    bg.fillStyle(0x120818, 1);
    bg.fillRect(-500, 0, W + 1000, TUNING.view.height);

    slam(this, 128, 30, 'SETTINGS', 28, CSS.pink, -3);

    // --- audio column ---
    panel(this, 24, 58, 292, 300, C.pink, 0.08);
    this.add.text(40, 68, 'AUDIO', { fontFamily: FONT.slam, fontSize: '16px', color: CSS.pink });
    makeSlider(this, 44, 118, 240, 'MUSIC', s.music, (v) => {
      Save.updateSettings({ music: v }); Audio.applySettings({ music: v });
    });
    makeSlider(this, 44, 176, 240, 'SFX / CROWD', s.sfx, (v) => {
      Save.updateSettings({ sfx: v }); Audio.applySettings({ sfx: v });
    });
    makeSlider(this, 44, 234, 240, 'ANNOUNCER', s.announcer, (v) => {
      Save.updateSettings({ announcer: v }); Audio.applySettings({ announcer: v });
    });
    makeToggle(this, 44, 300, 240, 'MUTE EVERYTHING', s.muted, (v) => {
      Save.updateSettings({ muted: v }); Audio.applySettings({ muted: v });
    });
    this.add.text(40, 330, 'All audio is generated in-browser. No licensed music ships in this build.', {
      fontFamily: FONT.mono, fontSize: '8px', color: CSS.bone, wordWrap: { width: 262 },
    }).setAlpha(0.55);

    // --- controls column ---
    panel(this, 334, 58, 292, 300, C.cyan, 0.08);
    this.add.text(350, 68, 'CONTROLS', { fontFamily: FONT.slam, fontSize: '16px', color: CSS.cyan });
    makeSlider(this, 354, 118, 240, 'CONTROL OPACITY', s.controlOpacity, (v) => {
      Save.updateSettings({ controlOpacity: Math.max(0.25, v) });
    });
    makeSlider(this, 354, 176, 240, 'CONTROL SIZE',
      (s.controlScale - 0.8) / 0.55, (v) => {
        Save.updateSettings({ controlScale: 0.8 + v * 0.55 });
      }, (v) => `${Math.round((0.8 + v * 0.55) * 100)}%`);
    makeSlider(this, 354, 234, 240, 'MATCH LENGTH',
      (s.matchLengthMin - 1) / 8, (v) => {
        Save.updateSettings({ matchLengthMin: Math.round(1 + v * 8) });
      }, (v) => `${Math.round(1 + v * 8)} MIN`);

    const diffs: ('EASY' | 'NORMAL' | 'BRUTAL')[] = ['EASY', 'NORMAL', 'BRUTAL'];
    const labels = { EASY: 'ROOKIE', NORMAL: 'CARD', BRUTAL: 'MAIN EVENT' };
    this.add.text(350, 282, 'DIFFICULTY', {
      fontFamily: FONT.mono, fontSize: '11px', color: CSS.bone,
    });
    diffs.forEach((d, i) => {
      makeButton(this, 396 + i * 88, 322, labels[d], () => {
        Save.updateSettings({ difficulty: d });
        this.scene.restart();
      }, { w: 84, h: 34, size: 11, color: s.difficulty === d ? C.acid : C.steel });
    });

    // --- accessibility column ---
    panel(this, 644, 58, 292, 300, C.acid, 0.08);
    this.add.text(660, 68, 'ACCESSIBILITY', { fontFamily: FONT.slam, fontSize: '16px', color: CSS.acid });
    makeToggle(this, 664, 110, 240, 'REDUCE SCREEN SHAKE', s.reduceShake,
      (v) => Save.updateSettings({ reduceShake: v }));
    makeToggle(this, 664, 156, 240, 'REDUCE FLASH / STROBE', s.reduceFlash,
      (v) => Save.updateSettings({ reduceFlash: v }));
    makeToggle(this, 664, 202, 240, 'HIGH-CONTRAST HUD', s.highContrast,
      (v) => Save.updateSettings({ highContrast: v }));
    makeToggle(this, 664, 248, 240, 'LARGE UI TEXT', s.largeText,
      (v) => Save.updateSettings({ largeText: v }));
    makeToggle(this, 664, 294, 240, 'SUBTITLES', s.subtitles,
      (v) => Save.updateSettings({ subtitles: v }));
    this.add.text(660, 330, 'Health and meters use shape and position, not colour alone.', {
      fontFamily: FONT.mono, fontSize: '8px', color: CSS.bone, wordWrap: { width: 262 },
    }).setAlpha(0.55);

    makeButton(this, 62, 400, 'BACK', () => this.scene.start('Menu'),
      { w: 104, h: 40, color: C.steel, size: 15 });
    makeButton(this, REF_W - 130, 400, 'RESET ALL PROGRESS', () => {
      Save.reset();
      Audio.applySettings(Save.settings);
      this.scene.restart();
    }, { w: 220, h: 40, color: C.blood, size: 13, sub: 'CLEARS UNLOCKS AND RECORDS' });

    this.add.text(REF_W / 2, 456, 'Settings and progress are stored locally in this browser.', {
      fontFamily: FONT.mono, fontSize: '9px', color: CSS.bone,
    }).setOrigin(0.5).setAlpha(0.5);

    centerLegacyLayout(this);
    crtOverlay(this);
    this.cameras.main.fadeIn(200, 0, 0, 0);
  }
}
