/** Finite state machine states shared by the player and the AI. */
export enum FS {
  IDLE = 'IDLE',
  WALK = 'WALK',
  RUN = 'RUN',
  ATTACK = 'ATTACK',
  GRAPPLE_START = 'GRAPPLE_START',
  GRAPPLING = 'GRAPPLING',
  GRAPPLED = 'GRAPPLED',
  BLOCK = 'BLOCK',
  REVERSAL = 'REVERSAL',
  STUN = 'STUN',
  DOWN = 'DOWN',
  GET_UP = 'GET_UP',
  TAUNT = 'TAUNT',
  PIN = 'PIN',
  PINNED = 'PINNED',
  WIN = 'WIN',
  LOSE = 'LOSE',
}

/** States in which a fighter may start a new action. */
export const ACTIONABLE: ReadonlySet<FS> = new Set([FS.IDLE, FS.WALK, FS.RUN, FS.BLOCK]);

/** States in which a fighter may be hit by a normal strike. */
export const HITTABLE: ReadonlySet<FS> = new Set([
  FS.IDLE, FS.WALK, FS.RUN, FS.ATTACK, FS.GRAPPLE_START,
  FS.BLOCK, FS.STUN, FS.TAUNT, FS.REVERSAL,
]);

/** States that lock a fighter out of movement. */
export const LOCKED: ReadonlySet<FS> = new Set([
  FS.ATTACK, FS.GRAPPLE_START, FS.GRAPPLING, FS.GRAPPLED, FS.REVERSAL,
  FS.STUN, FS.DOWN, FS.GET_UP, FS.TAUNT, FS.PIN, FS.PINNED, FS.WIN, FS.LOSE,
]);
