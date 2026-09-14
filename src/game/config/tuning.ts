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
     * A 2.5D fighting-game camera, not a three-quarter view of a ring.
     *
     * The first pass sat at -0.40 rad and five to six units back, and the result
     * read as a diorama: you were looking DOWN at a whole ring with two small
     * figures in it. 2.5D means the action plane is essentially parallel to the
     * screen and the bodies are big. So the yaw is now a few degrees off
     * side-on — enough that you can see these are solid 3D bodies in a space
     * with depth, and enough that two fighters standing at different depths
     * separate a little on screen instead of hiding behind each other, but not
     * enough to turn the ring into an object you look at.
     *
     * The distance is set from the phone's VERTICAL field of view, which is what
     * actually limits how big a wrestler can be. A 844x390 landscape viewport is
     * 2.16:1, so the horizontal width at these distances is over seven units —
     * the whole ring — and both fighters stay framed however far apart they get.
     * Framing for the width was what kept pushing the camera back.
     *
     * At minDist a 1.95-unit wrestler is a little over half the screen height.
     */
    yaw: -0.19,
    /**
     * A longer lens. 0.86 rad (49 degrees) is a wide lens, and a wide lens is
     * what made this read as a box you were peering into: near geometry flared,
     * the mat spread out below the fighters, and the ring became an object in
     * the frame rather than the plane the fight happens on. 0.72 flattens the
     * perspective so the far ropes and the crowd sit behind the action like a
     * backdrop.
     */
    fov: 0.72,
    /**
     * Lateral pan. Closer camera, so it has to follow the action further: at
     * 1.7 the camera gave up well before the fighters reached the ropes and a
     * corner exchange happened squashed against the edge of the frame.
     */
    panLimit: 2.3,
    /**
     * A lateral offset that pushes the action LEFT of screen centre. The three
     * buttons own the bottom-right corner permanently; the joystick on the left
     * is floating and only exists while a thumb is down. Framing dead centre put
     * the right-hand wrestler under the buttons whenever the two were far apart.
     *
     * It TAPERS OFF toward the left rope, because down there the bias is the
     * problem rather than the fix — it was pushing a corner exchange off the
     * left edge of the screen.
     */
    lookBias: 0.5,
    /** Depth contributes only a fraction of its value to the look point. */
    depthShift: 0.28,
    /**
     * Set from the VERTICAL field of view, which is what limits how big a
     * wrestler can be: at minDist a 2-unit wrestler is about 60% of the screen
     * height, at maxDist about 48%. The horizontal width at these distances is
     * seven to nine units on a 2.16:1 phone — wider than the ring — so both
     * fighters stay framed however far apart they get. Framing for the WIDTH is
     * what kept pushing the camera back into a diorama.
     */
    minDist: 4.9,
    maxDist: 6.1,
    /** Widening per unit of lateral separation. */
    spreadZoom: 0.26,
    /**
     * Only 0.4 above the look point, so the camera looks ACROSS the mat at
     * about four degrees rather than down into it. Every extra degree of tilt
     * turns another band of empty mat into foreground.
     *
     * Both values sit ~0.2 above a standing wrestler's centre of mass, which
     * translates the whole rig up without changing the tilt and so puts the
     * fighters slightly BELOW the middle of the frame. That matters on a phone:
     * the HUD owns the top quarter of a 390px-tall screen, and centred framing
     * put both wrestlers' heads behind it.
     */
    height: 2.64,
    /** Just above chest height on a standing wrestler. */
    lookHeight: 2.24,
    follow: 3.4,
    punchDecay: 7.5,
    /** Extra distance when a fighter is out on the floor. */
    outsidePull: 1.5,
    /**
     * How much of the pair's average height the look point follows, so the
     * camera tilts with a climb, a dive or two bodies on the mat instead of
     * holding one fixed line. Partial on purpose: following it fully would make
     * every hop move the horizon.
     */
    verticalFollow: 0.5,
    /**
     * When the two are at very different heights — one on the top rope, one on
     * the mat; one on the floor, one in the ring — there is more to fit in, so
     * the camera backs off and raises its look point to sit the taller
     * arrangement lower in frame and out from under the HUD. Following only the
     * AVERAGE height cannot do this: the average is the same whether they are
     * together or a mat-height apart.
     */
    verticalZoom: 0.85,
    verticalLift: 0.38,
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
