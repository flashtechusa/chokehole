/**
 * Global tuning. One file so feel can be balanced without hunting through
 * systems. Distances in ring units, times in ms.
 *
 * Match length target is 60-120s for the prototype (Bible s8). The rejected 2D
 * build defaulted to five minutes and ran out in twenty-four seconds; both
 * numbers are now driven from here and verified by the headless sim harness.
 */
export const TUNING = {
  ring: {
    /**
     * `half` is the play line: the fight runs from -3.2 to +3.2 and nowhere
     * else (see combat/ring.ts).
     *
     * `halfZ` is the ring's RENDERED depth and nothing more — no system reads
     * it for gameplay. It was 1.9 back when the fight could move in depth and
     * the band had to be kept shallow to stop the camera chasing it. With the
     * simulation on a line that reason is gone, and a shallow ring seen from an
     * elevated hard camera reads as a squashed box rather than a wrestling
     * ring. A ring is square, so this is square, and the fight happens along
     * the middle of it.
     */
    half: 3.2,
    halfZ: 3.2,
    /** Mat surface height above the floor. */
    matY: 1.06,
    ropeHeights: [0.42, 0.72, 1.02],
    postHeight: 1.44,
  },

  move: {
    walk: 1.0,
    run: 1.9,
    /** Stick magnitude above which the fighter breaks into a run. */
    runThreshold: 0.82,
    accel: 22,
    friction: 18,
    /** Air resistance. Low: a body in flight should keep going. */
    airDrag: 0.35,
    gravity: 16,
    /** Bodies push apart below this centre distance. */
    pushForce: 9,
    /**
     * Turn speed, radians/sec. Facing follows the STICK, not the opponent: the
     * player must be able to turn their back, run past, and be grabbed from
     * behind. Fast enough to feel responsive, slow enough to see the turn.
     */
    turnRate: 13,
  },

  combat: {
    /** A tap inside this window after the previous hit continues the combo. */
    comboWindowMs: 620,
    comboDamageFalloff: 0.9,
    /** Third light in a string upgrades to the heavy automatically (Bible s9.2). */
    autoHeavyOnCombo: 3,
    /** An attack on a stunned opponent is also a heavy. */
    heavyOnStunned: true,
    /** A pressed button survives this long looking for an opening. */
    bufferMs: 190,
    /** Grace after a rope bounce during which the stick cannot cancel the run. */
    reboundGraceMs: 420,

    /**
     * Light target assistance, applied once when an attack starts and never
     * per-frame. Only nudges toward a target already roughly in front and in
     * range, so it forgives thumb aim without stealing the turn from the player.
     */
    assistCone: 0.75,
    assistStrength: 0.75,
    assistRangeMult: 1.9,
    /**
     * Angle behind an opponent, measured from their own facing, that counts as
     * being behind them. Past this a GRAB becomes a rear grapple.
     */
    rearAngle: 2.0,

    grappleRange: 1.25,
    grappleHoldMs: 1500,
    /** Held fighter escapes after this many taps. */
    grappleEscapeTaps: 5,

    downMs: 1120,
    getUpMs: 320,
    getUpInvulnMs: 300,
    /** Mashing while down shortens it by this much per press. */
    downMashReduction: 70,

    /**
     * Catching someone as they come back off the ropes. This is the payoff the
     * Irish whip exists to set up, and it is what makes a whip worth spending a
     * grapple on: on its own the whip does 5 damage.
     */
    runningCounterMult: 2.1,

    /** Fallback only; each taunt carries its own duration, IT and heat. */
    tauntMs: 1000,
  },

  reversal: {
    /**
     * The cue appears this long before the attack becomes active, and a tap is
     * accepted for the whole window. Multiplied by the defender's reversal stat
     * and by the difficulty scale.
     */
    windowMs: 420,
    /** Reversal costs the attacker this much stun. */
    attackerStunMs: 750,
    defenderInvulnMs: 340,
    itGain: 18,
    heat: 14,
    /** Punishment for tapping ATTACK with no cue armed, so it cannot be spammed. */
    whiffLockoutMs: 260,
  },

  pin: {
    /**
     * Covers are allowed from just past half health. That is deliberate: a pin
     * you are supposed to kick out of is the near fall, and near falls are the
     * biggest crowd moment in the game. The escape zone below does the work of
     * making a pin at 50% survivable and a pin at 5% fatal.
     */
    maxHealthFrac: 0.55,
    /** IT and heat for surviving to the last count. Near falls are the payoff. */
    nearFallIt: 28,
    nearFallHeat: 40,
    range: 1.4,
    /** One sweep of the escape marker per count. */
    countMs: 1100,
    /** Escape zone half-width as a fraction of the bar, at full health. */
    zoneAtFullHealth: 0.34,
    /** ...and at zero health. Narrower means harder to kick out. */
    zoneAtZeroHealth: 0.06,
    /** A finisher landed this match narrows the zone further. */
    finisherZonePenalty: 0.55,
  },

  meters: {
    itMax: 100,
    signatureCost: 50,
    finisherCost: 100,
    /**
     * IT Factor per point of damage TAKEN. Deliberately small: the meter rewards
     * entertainment, not attrition, so a dive is worth more than a minute of
     * trading jabs.
     */
    itOnDamageTaken: 0.10,
    /**
     * Global multiplier on every IT gain. One knob so the time-to-finisher can
     * be tuned against the sim harness without editing forty move records.
     * Measured target: a finisher becomes available after roughly ninety
     * seconds of genuinely entertaining work, not thirty.
     */
    itScale: 0.5,
    /**
     * Repetition. IT Factor is a crowd meter, and a crowd stops caring about a
     * move it has just seen: each use of a move drops its freshness by
     * `freshnessDrop`, never below `freshnessFloor`, and it recovers fully over
     * `freshnessRecoverMs`. Damage is untouched — hitting the same jab still
     * hurts, it just stops being worth anything. This is what stops a
     * one-button grinder out-earning someone who uses the ring.
     */
    freshnessDrop: 0.3,
    freshnessFloor: 0.18,
    freshnessRecoverMs: 14000,

    /** Same idea for crowd heat, which used to peg at 100 inside half a minute. */
    heatScale: 0.55,
    heatMax: 100,
    heatDecayPerSec: 6.5,
    /** Heat scales IT Factor gain up to this multiplier at full heat. */
    heatItMult: 1.45,
  },

  squelsh: {
    /** First can drops this long after the bell. */
    firstSpawnMs: 18000,
    respawnMs: 30000,
    pickupRadius: 0.85,
    /** The can bobs this far above the mat. */
    hoverY: 0.55,
  },

  props: {
    /** An oversized prop appears this long into the match. */
    spawnMs: 26000,
    respawnMs: 45000,
    pickupRadius: 1.0,
    /**
     * Swings before the thing falls apart. Measured at unlimited: whoever picked
     * a prop up simply won, twenty hits in a row, and every other system stopped
     * mattering. Three swings makes it a spot, not a strategy.
     */
    uses: 3,
  },

  match: {
    /**
     * A CHOKE HOLE match is a show with an arc: opening strikes, rope running,
     * a prop spot, a near fall, a reversal, a dive, then the finisher. Ordinary
     * attacks must never produce a routine twenty-second victory, so the clock
     * is four minutes and the pin is gated behind real damage.
     */
    durationMs: 300000,
    /**
     * Damage multiplier across the match, from the opening bell to the time
     * limit. This is the arc, and it is deliberately not "more HP": early
     * exchanges are a feeling-out process that barely moves the bar, and the
     * closing stretch is where a big move actually ends someone. It is also
     * what stops two basic moves producing a three-count.
     */
    damageEarly: 0.5,
    damageLate: 1.45,
    introMs: 3600,
    bellDelayMs: 700,
    /** Ten count for a fighter left at zero health. */
    koCountMs: 9000,
  },

  camera: {
    /**
     * The broadcast hard camera, matched to the genre reference (Action Arcade
     * Wrestling): outside the ring, up at about twenty degrees, looking down
     * across the mat. The near ropes cross the fighters at the ankle and frame
     * the bottom of the picture; the far ropes and the crowd sit behind them.
     *
     * A PERSPECTIVE lens. An orthographic pass flattened the ring into a
     * diagram — parallel ropes, near and far posts the same size, no sense of a
     * box to fight inside. What makes this game 2.5D is that the SIMULATION
     * runs on a line, not that the projection is flat.
     */

    /**
     * A small swing off dead-on, so a corner post reads and the ring looks like
     * an object you are standing beside rather than a painted backdrop. Enough
     * to see the corner; not enough for the fight to stop running left to right.
     */
    yaw: 0.15,
    /**
     * Elevation in radians — about twenty degrees. This is what stops the ropes
     * cutting across the fighters: from up here the near ropes sit at their
     * ankles and the far ropes behind their shoulders, instead of a side-on
     * view putting both across their chests.
     *
     * Stored as an ANGLE, not a height, so raising the look point for a
     * turnbuckle or dropping it for a body on the floor tilts the shot with the
     * action instead of flattening it.
     */
    pitch: 0.35,
    /**
     * Lateral pan, in ring units. The camera tracks the fight along the line,
     * which is the only thing it has to follow.
     */
    panLimit: 2.3,
    /**
     * A fixed offset that pushes the action LEFT of screen centre, tapering to
     * nothing at the left rope. The three buttons own the bottom-right corner;
     * the joystick on the left is floating and only exists while a thumb is
     * down.
     */
    lookBias: 0.5,
    /** Vertical field of view. An ordinary lens, not a wide one. */
    fov: 0.75,
    /**
     * Framed like the reference: wide enough that the ring is the picture and
     * the near ropes are in shot, close enough that a phone can read two
     * wrestlers. A 2-unit wrestler is about 42% of the screen height at
     * minDist and 33% at maxDist.
     */
    minDist: 5.2,
    maxDist: 6.9,
    /** Widening per unit of separation along the line. */
    spreadZoom: 0.34,
    /**
     * Where the camera is aimed, in world height. A little above the mat: the
     * fighters then sit below the middle of the frame, clear of a HUD that owns
     * the top quarter of a 390px screen, with the canvas beneath them.
     */
    lookHeight: 2.26,
    follow: 3.4,
    punchDecay: 7.5,
    /** Extra distance when a fighter is out on the floor. */
    outsidePull: 1.5,
    /**
     * When the two are at very different heights — one on the top rope, one on
     * the mat; one on the floor, one in the ring — there is more to fit in, so
     * the camera backs off and raises its look point.
     */
    verticalZoom: 1.25,
    verticalLift: 0.16,
    /** How much of the pair's average height the look point follows. */
    verticalFollow: 0.5,
  },

  fx: {
    hitStopLight: 42,
    hitStopHeavy: 90,
    hitStopFinisher: 200,
  },
};

/**
 * Deliberately not `as const`. Marking this object const gives every field a
 * literal type, so any variable initialised from TUNING is inferred as e.g.
 * `-0.62` instead of `number` and cannot be reassigned. The values are only ever
 * read, so widening them costs nothing.
 */
export type Tuning = typeof TUNING;
