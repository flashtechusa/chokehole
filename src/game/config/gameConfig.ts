import Phaser from 'phaser';
import { TUNING } from './tuning';

export function buildGameConfig(scenes: Phaser.Types.Scenes.SceneType[]): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#0a0410',
    width: TUNING.view.width,
    height: TUNING.view.height,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: TUNING.view.width,
      height: TUNING.view.height,
      // Landscape-first; the DOM gate in index.html handles portrait.
      expandParent: true,
    },
    render: {
      antialias: true,
      roundPixels: false,
      powerPreference: 'high-performance',
    },
    input: {
      activePointers: 4,
      touch: { capture: true },
    },
    fps: { target: 60, forceSetTimeOut: false },
    disableContextMenu: true,
    autoFocus: true,
    scene: scenes,
  };
}
