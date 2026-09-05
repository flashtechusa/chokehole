/**
 * The single control surface the game understands. The touch pad, the keyboard
 * and the AI all produce one of these; nothing downstream knows the difference.
 */
export interface Intent {
  /** -1..1 lateral. */
  moveX: number;
  /** -1..1 depth (negative = toward the back rope). */
  moveY: number;
  /** Edge: STRIKE pressed this frame. */
  strike: boolean;
  /** STRIKE is currently held (drives the heavy charge). */
  strikeHeld: boolean;
  /** Edge: STRIKE released this frame. */
  strikeRelease: boolean;
  /** Edge: GRAPPLE pressed this frame. */
  grapple: boolean;
  grappleHeld: boolean;
  /** Edge: SQUELSH/SPECIAL pressed this frame. */
  special: boolean;
  /** STRIKE + GRAPPLE held together = block / reversal. */
  block: boolean;
  /** Any button pressed this frame — used for mashing out of holds and pins. */
  anyPress: boolean;
}

export function neutralIntent(): Intent {
  return {
    moveX: 0, moveY: 0,
    strike: false, strikeHeld: false, strikeRelease: false,
    grapple: false, grappleHeld: false,
    special: false, block: false, anyPress: false,
  };
}
