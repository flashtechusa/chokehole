import Phaser from 'phaser';
import { C, CSS, FONT } from '@/game/config/palette';
import { TUNING } from '@/game/config/tuning';
import { crtOverlay, makeButton, panel, slam } from '@/game/ui/Kit';
import { makeSlider, makeToggle } from '@/game/ui/Widgets';
import { Save } from '@/game/save/SaveManager';
import { Audio } from '@/game/audio/AudioManager';
import { fs } from '@/game/config/type';

const W = TUNING.view.width;
const H = TUNING.view.height;

/**
 * Three columns sized from the live canvas width. At the readability floor the
 * old 960-wide reference columns were too narrow to hold a label and its value
 * on the same row, so the layout is now proportional instead.
 */
export class SettingsScene extends Phaser.Scene {
  constructor() { super('Settings'); }

  create(): void {
    const s = Save.settings;
    this.cameras.main.setBackgroundColor('#0a0410');
    const bg = this.add.graphics();
    bg.fillStyle(0x120818, 1);
    bg.fillRect(0, 0, W, H);

    slam(this, 118, 28, 'SETTINGS', 24, CSS.pink, -3);

    const margin = 24;
    const gutter = 22;
    const colW = (W - margin * 2 - gutter * 2) / 3;
    const colX = (i: number): number => margin + i * (colW + gutter);
    const top = 56;
    const colH = 356;
    const inner = colW - 36;
    const ix = (i: number): number => colX(i) + 20;

    const heading = (i: number, text: string, color: string): void => {
      this.add.text(colX(i) + 16, top + 12, text, {
        fontFamily: FONT.slam, fontSize: fs(16), color,
      });
    };

    // --- audio ---
    panel(this, colX(0), top, colW, colH, C.pink, 0.08);
    heading(0, 'AUDIO', CSS.pink);
    makeSlider(this, ix(0), top + 78, inner, 'MUSIC', s.music, (v) => {
      Save.updateSettings({ music: v }); Audio.applySettings({ music: v });
    });
    makeSlider(this, ix(0), top + 140, inner, 'SFX / CROWD', s.sfx, (v) => {
      Save.updateSettings({ sfx: v }); Audio.applySettings({ sfx: v });
    });
    makeSlider(this, ix(0), top + 202, inner, 'ANNOUNCER', s.announcer, (v) => {
      Save.updateSettings({ announcer: v }); Audio.applySettings({ announcer: v });
    });
    makeToggle(this, ix(0), top + 258, inner, 'MUTE EVERYTHING', s.muted, (v) => {
      Save.updateSettings({ muted: v }); Audio.applySettings({ muted: v });
    });
    this.add.text(colX(0) + 16, top + 288, 'All audio is generated in-browser. No licensed music ships in this build.', {
      fontFamily: FONT.mono, fontSize: fs(8), color: CSS.bone,
      wordWrap: { width: colW - 32 }, lineSpacing: 2,
    }).setAlpha(0.55);

    // --- controls ---
    panel(this, colX(1), top, colW, colH, C.cyan, 0.08);
    heading(1, 'CONTROLS', CSS.cyan);
    makeSlider(this, ix(1), top + 78, inner, 'CONTROL OPACITY', s.controlOpacity, (v) => {
      Save.updateSettings({ controlOpacity: Math.max(0.25, v) });
    });
    makeSlider(this, ix(1), top + 140, inner, 'CONTROL SIZE',
      (s.controlScale - 0.8) / 0.55, (v) => {
        Save.updateSettings({ controlScale: 0.8 + v * 0.55 });
      }, (v) => `${Math.round((0.8 + v * 0.55) * 100)}%`);
    makeSlider(this, ix(1), top + 202, inner, 'MATCH LENGTH',
      (s.matchLengthMin - 1) / 8, (v) => {
        Save.updateSettings({ matchLengthMin: Math.round(1 + v * 8) });
      }, (v) => `${Math.round(1 + v * 8)} MIN`);

    const diffs: ('EASY' | 'NORMAL' | 'BRUTAL')[] = ['EASY', 'NORMAL', 'BRUTAL'];
    const labels = { EASY: 'ROOKIE', NORMAL: 'CARD', BRUTAL: 'MAIN EVENT' };
    this.add.text(colX(1) + 16, top + 244, 'DIFFICULTY', {
      fontFamily: FONT.mono, fontSize: fs(11), color: CSS.bone,
    });
    const dW = (inner - 16) / 3;
    diffs.forEach((d, i) => {
      makeButton(this, ix(1) + dW / 2 + i * (dW + 8), top + 296, labels[d], () => {
        Save.updateSettings({ difficulty: d });
        this.scene.restart();
      }, { w: dW, h: 38, size: 12, color: s.difficulty === d ? C.acid : C.steel, skew: 6 });
    });

    // --- accessibility ---
    panel(this, colX(2), top, colW, colH, C.acid, 0.08);
    heading(2, 'ACCESSIBILITY', CSS.acid);
    const toggles: [string, boolean, (v: boolean) => void][] = [
      ['REDUCE SCREEN SHAKE', s.reduceShake, (v) => Save.updateSettings({ reduceShake: v })],
      ['REDUCE FLASH / STROBE', s.reduceFlash, (v) => Save.updateSettings({ reduceFlash: v })],
      ['HIGH-CONTRAST HUD', s.highContrast, (v) => Save.updateSettings({ highContrast: v })],
      ['LARGE UI TEXT', s.largeText, (v) => Save.updateSettings({ largeText: v })],
      ['SUBTITLES', s.subtitles, (v) => Save.updateSettings({ subtitles: v })],
    ];
    toggles.forEach(([label, val, on], i) => {
      makeToggle(this, ix(2), top + 62 + i * 46, inner, label, val, on);
    });
    this.add.text(colX(2) + 16, top + 300, 'Health and meters use shape and position, not colour alone.', {
      fontFamily: FONT.mono, fontSize: fs(8), color: CSS.bone,
      wordWrap: { width: colW - 32 }, lineSpacing: 2,
    }).setAlpha(0.55);

    // --- footer ---
    makeButton(this, margin + 74, 454, 'BACK', () => this.scene.start('Menu'),
      { w: 148, h: 44, color: C.steel, size: 15 });
    makeButton(this, W - margin - 140, 454, 'RESET ALL PROGRESS', () => {
      Save.reset();
      Audio.applySettings(Save.settings);
      this.scene.restart();
    }, { w: 280, h: 44, color: C.blood, size: 13, sub: 'CLEARS UNLOCKS AND RECORDS' });

    this.add.text(W / 2, 506, 'Settings and progress are stored locally in this browser.', {
      fontFamily: FONT.mono, fontSize: fs(9), color: CSS.bone,
    }).setOrigin(0.5).setAlpha(0.5);

    crtOverlay(this);
    this.cameras.main.fadeIn(200, 0, 0, 0);
  }
}
