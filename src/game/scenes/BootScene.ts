import Phaser from 'phaser';
import { Save } from '@/game/save/SaveManager';
import { Audio } from '@/game/audio/AudioManager';

/** Applies persisted settings and hands off to the title broadcast. */
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create(): void {
    const s = Save.settings;
    Audio.applySettings({
      music: s.music, sfx: s.sfx, announcer: s.announcer, muted: s.muted,
    });
    this.scene.start('Title');
  }
}
