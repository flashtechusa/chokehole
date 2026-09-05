import Phaser from 'phaser';
import { buildGameConfig } from '@/game/config/gameConfig';
import { BootScene } from '@/game/scenes/BootScene';
import { TitleScene } from '@/game/scenes/TitleScene';
import { MenuScene } from '@/game/scenes/MenuScene';
import { SelectScene } from '@/game/scenes/SelectScene';
import { MatchScene } from '@/game/scenes/MatchScene';
import { ResultsScene } from '@/game/scenes/ResultsScene';
import { ArchiveScene } from '@/game/scenes/ArchiveScene';
import { RosterScene } from '@/game/scenes/RosterScene';
import { SettingsScene } from '@/game/scenes/SettingsScene';
import { HowToScene } from '@/game/scenes/HowToScene';

const game = new Phaser.Game(
  buildGameConfig([
    BootScene, TitleScene, MenuScene, SelectScene,
    MatchScene, ResultsScene, ArchiveScene, RosterScene,
    SettingsScene, HowToScene,
  ]),
);

// Hide the pre-Phaser splash once the first scene has painted.
game.events.once(Phaser.Core.Events.READY, () => {
  const splash = document.getElementById('boot-splash');
  if (splash) {
    splash.classList.add('hide');
    window.setTimeout(() => splash.remove(), 420);
  }
});

// Exposed for debugging and automated smoke tests (see docs/DEPLOYMENT.md).
(window as unknown as { __CHOKEHOLE__: Phaser.Game }).__CHOKEHOLE__ = game;

// Debug overlay: ?debug=true
if (new URLSearchParams(window.location.search).get('debug') === 'true') {
  document.body.dataset.debug = 'true';
}

export default game;
