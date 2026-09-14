/**
 * The single control surface the game understands. The touch pad, the keyboard
 * and the AI all produce one of these; nothing downstream can tell them apart.
 *
 * v2.0 has three buttons and no chords (Bible s9): ATTACK, GRAB, IT/SPECIAL.
 * The reversal is a timed ATTACK tap, not a combination.
 */
export interface Intent {
  /** Analog stick, -1..1 each, magnitude drives walk vs run. */
  moveX: number;
  moveY: number;
  /** Edge: pressed this frame. */
  attack: boolean;
  grab: boolean;
  special: boolean;
  /** Any of the three pressed this frame, for mashing out of holds. */
  anyPress: boolean;
}

export function neutralIntent(): Intent {
  return { moveX: 0, moveY: 0, attack: false, grab: false, special: false, anyPress: false };
}

export function stickMagnitude(i: Intent): number {
  return Math.min(1, Math.hypot(i.moveX, i.moveY));
}
