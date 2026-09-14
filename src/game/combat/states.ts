/**
 * Fighter states.
 *
 * There is deliberately no BLOCK state: v2.0 removed the two-button chord, so
 * defence is the single timed ATTACK tap handled by ReversalSystem.
 *
 * The ring is a playground, not scenery, so the state machine covers running the
 * ropes, climbing, perching, flying and being outside the ring.
 */
export enum FS {
  ENTRANCE = 'ENTRANCE',
  IDLE = 'IDLE',
  WALK = 'WALK',
  RUN = 'RUN',
  /** Sprinting between ropes; rebounds automatically at each side. */
  ROPE_RUN = 'ROPE_RUN',
  /** Climbing a turnbuckle. */
  CLIMB = 'CLIMB',
  /** Standing on the top turnbuckle, actionable. */
  PERCH = 'PERCH',
  /** Committed and airborne on a leaping attack. */
  AERIAL = 'AERIAL',
  /** Standing on the ring apron, outside the ropes. */
  APRON = 'APRON',
  ATTACK = 'ATTACK',
  STUN = 'STUN',
  REVERSAL = 'REVERSAL',
  GRAPPLE_START = 'GRAPPLE_START',
  GRAPPLING = 'GRAPPLING',
  GRAPPLED = 'GRAPPLED',
  /** Held from behind and walked around the ring. */
  DRAGGING = 'DRAGGING',
  DRAGGED = 'DRAGGED',
  /** Whipped into the ropes by the opponent and rebounding back. */
  WHIPPED = 'WHIPPED',
  /** Slumped in a corner, open to corner attacks. */
  CORNERED = 'CORNERED',
  THROWN = 'THROWN',
  DOWN = 'DOWN',
  GETUP = 'GETUP',
  PIN = 'PIN',
  PINNED = 'PINNED',
  TAUNT = 'TAUNT',
  WIN = 'WIN',
  LOSE = 'LOSE',
}

/** States in which the fighter accepts new actions from an Intent. */
export const ACTIONABLE: ReadonlySet<FS> = new Set([
  FS.IDLE, FS.WALK, FS.RUN, FS.ROPE_RUN, FS.PERCH, FS.APRON,
]);

/** States in which the fighter may be struck by a normal move. */
export const HITTABLE: ReadonlySet<FS> = new Set([
  FS.IDLE, FS.WALK, FS.RUN, FS.ROPE_RUN, FS.ATTACK, FS.STUN, FS.GRAPPLE_START,
  FS.TAUNT, FS.GETUP, FS.WHIPPED, FS.CORNERED, FS.APRON, FS.CLIMB, FS.PERCH,
  FS.AERIAL, FS.DRAGGING,
]);

/** States that lock movement input entirely. */
export const LOCKED: ReadonlySet<FS> = new Set([
  FS.ATTACK, FS.STUN, FS.REVERSAL, FS.GRAPPLING, FS.GRAPPLED, FS.THROWN,
  FS.DOWN, FS.GETUP, FS.PIN, FS.PINNED, FS.TAUNT, FS.WIN, FS.LOSE, FS.ENTRANCE,
  FS.CLIMB, FS.AERIAL, FS.WHIPPED, FS.CORNERED, FS.DRAGGED,
]);

/** On the mat or the floor, unable to stand. */
export const GROUNDED: ReadonlySet<FS> = new Set([FS.DOWN, FS.THROWN, FS.PINNED]);

/** Standing somewhere the fighter can fall off. */
export const ELEVATED: ReadonlySet<FS> = new Set([FS.PERCH, FS.APRON, FS.CLIMB]);
