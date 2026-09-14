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
     * A 2.5D camera: 3D models and a 3D arena, shot DEAD side-on.
     *
     * Zero, not "nearly zero". Any yaw at all turns the ring into an object
     * you are looking at from a corner: the ropes converge, the mat becomes a
     * receding trapezoid, and the picture reads as 3D no matter what the
     * simulation is doing underneath. Square on, the ropes are horizontal
     * lines, the posts line up, and the ring reads as a stage.
     */
    yaw: 0,
    /**
     * Lateral pan, in ring units. The camera tracks the fight along the line,
     * which is now the only thing it has to follow.
     */
    panLimit: 2.3,
    /**
     * A fixed offset that pushes the action LEFT of screen centre, tapering to
     * nothing at the left rope. The three buttons own the bottom-right corner
     * permanently; the joystick on the left is floating and only exists while a
     * thumb is down.
     */
    lookBias: 0.5,
    /**
     * A longer lens. 0.86 rad (49 degrees) is wide, and a wide lens flares near
     * geometry and spreads the mat out below the fighters. 0.72 flattens the
     * perspective so the ring reads as a backdrop behind the action.
     */
    fov: 0.66,
    /**
     * Read as "how much world fits on screen", not "how far the camera stands"
     * — the projection is orthographic, so distance changes nothing about
     * scale. At minDist a 2-unit wrestler is about 62% of the screen height, at
     * maxDist about 49%. The horizontal span is six to eight units on a 2.16:1
     * phone — wider than the ring — so both fighters stay framed however far
     * apart they get.
     */
    minDist: 4.4,
    maxDist: 5.95,
    /** Widening per unit of separation along the line. */
    spreadZoom: 0.30,
    /**
     * How far the camera looks DOWN, in radians. 0.56 is about 32 degrees.
     *
     * A high angle is the standard wrestling shot and it is what stops the near
     * ropes cutting across the fighters: past about 28 degrees the near top
     * rope drops below their feet, so you look OVER the ropes at the mat rather
     * than through them. Under a perspective lens that tilt would have spread
     * the mat into a receding trapezoid, which is why earlier passes kept
     * driving the camera back down to rope height. Orthographically it costs
     * nothing — parallel stays parallel at any angle — so the shot can be
     * angled like a wrestling camera and still read flat.
     *
     * It is stored as an ANGLE, not a height, so that the tilt stays fixed when
     * the look point rises for a turnbuckle or drops for a body on the floor.
     */
    pitch: 0.53,
    /**
     * Where the camera is aimed, in world height. Above a standing wrestler's
     * centre of mass on purpose: it puts them below the middle of the frame,
     * clear of a HUD that owns the top quarter of a 390px screen.
     */
    lookHeight: 2.52,
    follow: 3.4,
    punchDecay: 7.5,
    /** Extra distance when a fighter is out on the floor. */
    outsidePull: 1.5,
    /**
     * When the two are at very different heights — one on the top rope, one on
     * the mat; one on the floor, one in the ring — there is more to fit in, so
     * the camera backs off and raises its look point to sit the taller
     * arrangement lower in frame and out from under the HUD.
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
