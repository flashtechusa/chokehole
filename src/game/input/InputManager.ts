import Phaser from 'phaser';
import type { Intent } from './Intent';
import { neutralIntent } from './Intent';
import { TouchControls } from './TouchControls';

interface RawState { moveX: number; moveY: number; a: boolean; b: boolean; c: boolean; }

/**
 * Fuses the on-screen pad and the keyboard into one Intent per frame and derives
 * the press/release edges the combat FSM needs.
 *
 * Keyboard fallback (Design Bible section 8):
 *   WASD / arrows = move, J = strike, K = grapple, L = special,
 *   Space = block/reversal, Esc = pause.
 */
export class InputManager {
  readonly pad: TouchControls;
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private prev: RawState = { moveX: 0, moveY: 0, a: false, b: false, c: false };
  private intent: Intent = neutralIntent();

  constructor(scene: Phaser.Scene) {
    this.pad = new TouchControls(scene);

    const kb = scene.input.keyboard;
    if (kb) {
      const K = Phaser.Input.Keyboard.KeyCodes;
      this.keys = {
        up: kb.addKey(K.W), up2: kb.addKey(K.UP),
        down: kb.addKey(K.S), down2: kb.addKey(K.DOWN),
        left: kb.addKey(K.A), left2: kb.addKey(K.LEFT),
        right: kb.addKey(K.D), right2: kb.addKey(K.RIGHT),
        strike: kb.addKey(K.J),
        grapple: kb.addKey(K.K),
        special: kb.addKey(K.L),
        block: kb.addKey(K.SPACE),
      };
      // Stop the browser scrolling the page under the canvas.
      kb.addCapture([K.SPACE, K.UP, K.DOWN, K.LEFT, K.RIGHT]);
    }
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  private down(name: string): boolean {
    return this.keys[name]?.isDown ?? false;
  }

  /** Computes this frame's Intent. Call once per update. */
  update(): Intent {
    const p = this.pad.read();
    const kx = (this.down('right') || this.down('right2') ? 1 : 0) - (this.down('left') || this.down('left2') ? 1 : 0);
    const ky = (this.down('down') || this.down('down2') ? 1 : 0) - (this.down('up') || this.down('up2') ? 1 : 0);

    const raw: RawState = {
      moveX: kx !== 0 ? kx : p.moveX,
      moveY: ky !== 0 ? ky : p.moveY,
      a: p.strike || this.down('strike'),
      b: p.grapple || this.down('grapple'),
      c: p.special || this.down('special'),
    };

    const blockKey = this.down('block');
    const block = blockKey || (raw.a && raw.b);

    const it = this.intent;
    it.moveX = raw.moveX;
    it.moveY = raw.moveY;
    it.strike = raw.a && !this.prev.a;
    it.strikeHeld = raw.a;
    it.strikeRelease = !raw.a && this.prev.a;
    it.grapple = raw.b && !this.prev.b && !block;
    it.grappleHeld = raw.b;
    it.special = raw.c && !this.prev.c;
    it.block = block;
    it.anyPress = (raw.a && !this.prev.a) || (raw.b && !this.prev.b) || (raw.c && !this.prev.c);

    this.prev = raw;
    return it;
  }

  /** Clears held state (used when the match pauses or ends). */
  reset(): void {
    this.prev = { moveX: 0, moveY: 0, a: false, b: false, c: false };
    this.intent = neutralIntent();
  }

  destroy(): void {
    this.pad.destroy();
  }
}
