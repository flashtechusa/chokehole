import Phaser from 'phaser';
import type { WrestlerConfig } from '@/game/types';
import { Fighter } from '@/game/combat/Fighter';
import { FS } from '@/game/combat/states';
import { NOLA_WAREHOUSE_2018 } from '@/game/data/arenas/nolaWarehouse2018';
import { FighterView } from './FighterView';

/**
 * A live, animated wrestler used on menus and cards. Same rig as the match, so
 * a character always looks in menus exactly like they look in the ring.
 */
export class Portrait {
  private fighter: Fighter;
  private view: FighterView;

  constructor(
    scene: Phaser.Scene, cfg: WrestlerConfig,
    x: number, y: number, scale = 1, facing: 1 | -1 = 1,
  ) {
    this.fighter = new Fighter(cfg, 1);
    this.fighter.facing = facing;
    this.view = new FighterView(scene, cfg, NOLA_WAREHOUSE_2018);
    this.view.overridePlacement = { x, y, scale };
    this.view.update(this.fighter, 0, false);
  }

  get root(): Phaser.GameObjects.Container { return this.view.root; }

  setPose(state: FS): void {
    this.fighter.setState(state);
  }

  setPlacement(x: number, y: number, scale: number): void {
    this.view.overridePlacement = { x, y, scale };
  }

  setFacing(f: 1 | -1): void { this.fighter.facing = f; }

  update(dtMs: number): void {
    this.fighter.stateTime += dtMs / 1000;
    this.view.update(this.fighter, dtMs, false);
  }

  setVisible(v: boolean): void { this.view.setVisible(v); }

  destroy(): void { this.view.destroy(); }
}
