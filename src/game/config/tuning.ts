/**
 * Global combat tuning. Kept in one place so the feel can be balanced without
 * hunting through systems.  All times in ms, all distances in ring units
 * (1 ring unit == 1 virtual pixel at depth 0.5).
 */
/**
 * Design resolution. Height is fixed at 540; width follows the device's
 * landscape aspect ratio so the canvas fills a modern phone edge-to-edge
 * instead of letterboxing ~18% of the screen away from the player's thumbs.
 * Computed once at import, from the longest/shortest screen edge, so it is
 * correct even if the page loads in portrait.
 */
function designWidth(): number {
  if (typeof window === 'undefined') return 960;
  const long = Math.max(window.innerWidth, window.innerHeight);
  const short = Math.min(window.innerWidth, window.innerHeight);
  const aspect = short > 0 ? long / short : 16 / 9;
  return Math.round(540 * Math.max(16 / 9, Math.min(21 / 9, aspect)));
}

const VIEW_W = designWidth();
const VIEW_H = 540;

export const TUNING = {
  /** Virtual design resolution. Landscape, height-locked. */
  view: { width: VIEW_W, height: VIEW_H },

  ring: {
    /** Screen-space centre of the ring floor. */
    centerX: VIEW_W / 2,
    baseY: 366,
    /** Playable depth band, in normalised units. 0 = far rope, 1 = near rope. */
    depthPixels: 92,
    /** Scale of a fighter at depth 0 and depth 1. */
    scaleBack: 1.04,
    scaleFront: 1.38,
    ropeBounce: 1.55,
  },

  fighter: {
    /** Multiplier applied to WrestlerStats.speed for walk. */
    walkMult: 1.0,
    runMult: 1.85,
    /** Depth movement is slower than lateral for a wrestling-camera feel. */
    depthMult: 0.55,
    accel: 2600,
    friction: 3400,
    gravity: 1750,
    /** Minimum separation before bodies push each other apart. */
    bodyRadius: 33,
    pushForce: 340,
    /** Double-tap threshold to break into a run. */
    dashWindow: 260,
    hurtboxHeight: 118,
  },

  combat: {
    /** Held duration on STRIKE that upgrades a light into a heavy. */
    heavyChargeMs: 210,
    /** Reversal is armed for this long after BLOCK is entered. */
    reversalWindow: 260,
    /** Block reduces damage to this fraction. */
    blockChip: 0.22,
    /** Guard breaks after this much blocked damage. */
    guardBreak: 34,
    guardRegenPerSec: 12,
    /** Combo window: another hit inside this continues the combo counter. */
    comboWindow: 900,
    comboDamageFalloff: 0.86,
    /** Grapple. */
    grappleRange: 68,
    grappleStartup: 170,
    grappleHoldMs: 1400,
    grappleEscapeTaps: 5,
    throwDamage: 13,
    /** Down / recovery. */
    downMs: 1150,
    getUpMs: 380,
    getUpInvulnMs: 320,
    downMashReduction: 90,
    /** Pin. */
    pinRange: 74,
    pinCountMs: 780,
    pinEscapeTapsBase: 7,
    /** Fraction of max health under which a pin becomes realistically winnable. */
    pinDangerHealth: 0.42,
    /** Ten-count KO if a 0-health fighter is left lying there. */
    koCountMs: 9000,
    /** Taunt. */
    tauntMs: 900,
    tauntSquelsh: 9,
    tauntHeat: 11,
  },

  meters: {
    squelshMax: 100,
    signatureCost: 50,
    finisherCost: 100,
    /** SQUELSH gained per point of damage taken. */
    squelshOnDamageTaken: 0.55,
    reversalSquelsh: 14,
    heatMax: 100,
    heatDecayPerSec: 3.4,
    heatComboBonus: 3,
    /** Heat multiplies SQUELSH gain up to this at 100 heat. */
    heatSquelshMult: 1.5,
  },

  match: {
    durationMs: 5 * 60 * 1000,
    introMs: 5200,
    /** Bell-to-bell delay after the intro. */
    startDelayMs: 900,
  },

  fx: {
    hitStopLight: 45,
    hitStopHeavy: 95,
    hitStopFinisher: 260,
    shakeLight: 0.0025,
    shakeHeavy: 0.007,
  },
};

export type Tuning = typeof TUNING;
