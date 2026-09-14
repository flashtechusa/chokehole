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
     * The play space is 2.5D: wide across, shallow in depth. Free 3D navigation
     * tested badly — the fight wandered, the camera had to pull back to follow
     * it, and the wrestlers ended up tiny. A shallow depth band keeps both
     * fighters large and the geometry readable while still being a real 3D
     * space you can walk around in.
     */
    half: 3.2,
    halfZ: 1.9,
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
     * A FIXED three-quarter wrestling view. It pans, it shifts slightly with
     * depth and it zooms a little — it never orbits. A camera that continuously
     * rotated around the action was the main reason free-3D play was hard to
     * read: the player's sense of left and right kept moving.
     */
    yaw: -0.40,
    /** Lateral pan is damped and clamped, so the world does not slide around. */
    panLimit: 1.15,
    /** Depth contributes only a fraction of its value to the look point. */
    depthShift: 0.35,
    /** Tight zoom range: the wrestlers must stay large on a phone. */
    minDist: 4.6,
    maxDist: 6.2,
    /** Widening per unit of lateral separation. */
    spreadZoom: 0.42,
    /** Above the top rope and the posts (mat 1.06 + post 1.44 = 2.5). */
    /** Flat enough to look THROUGH the ring rather than down into the mat. */
    height: 2.45,
    /** Chest height of a standing wrestler, so the fighters centre in frame. */
    lookHeight: 1.95,
    follow: 3.4,
    punchDecay: 7.5,
    /** Extra distance when a fighter is out on the floor. */
    outsidePull: 1.5,
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
