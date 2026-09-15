export type Difficulty = 'EASY' | 'NORMAL' | 'BRUTAL';

export interface AIProfile {
  id: Difficulty;
  label: string;
  /** ms between plan changes. */
  thinkMs: number;
  /** Reaction delay before responding to a telegraphed attack. */
  reactionMs: number;
  /** Probability of attempting a reversal when the cue is armed. */
  reversalChance: number;
  /** How much of the reversal window the AI gets, relative to the player's. */
  reversalWindowScale: number;
  grabChance: number;
  aggression: number;
  specialEagerness: number;
  pinEagerness: number;
  tauntChance: number;
  /** Probability of going for the Squelsh can when one is on the mat. */
  canChance: number;
  /** Probability of going for an oversized prop at ringside. */
  propChance: number;
  /** Probability of circling behind for a rear grapple. */
  flankChance: number;
  /**
   * How often the AI reaches for the theatrical option — ropes, turnbuckle,
   * dives — instead of the safe one. The opponent has to be entertaining too.
   */
  spectacle: number;
  /** Accuracy of the pin-escape timing tap, 0..1. */
  pinSkill: number;
  /** Probability of mashing out of a grapple on any given opportunity. */
  mashRate: number;
  /**
   * How long the AI plays to the crowd after putting someone on the mat,
   * instead of standing over them and hitting them again.
   *
   * This is a playability control wearing a character costume. Without it the
   * AI re-engages the instant the player stands, and `npm run agency` measured
   * what that does from the player's side of the screen: a median of half a
   * second of control between knockdowns. It is also just what a heel does.
   */
  respectMs: number;
}

/**
 * Difficulty changes reaction and tendency windows only. It never touches
 * damage, health or reach, and the AI never reads input before it happens
 * (Bible s28).
 */
export const AI_PROFILES: Record<Difficulty, AIProfile> = {
  EASY: {
    id: 'EASY', label: 'ROOKIE',
    thinkMs: 620, reactionMs: 430,
    reversalChance: 0.10, reversalWindowScale: 0.7,
    grabChance: 0.20, aggression: 0.52, specialEagerness: 0.35,
    pinEagerness: 0.5, tauntChance: 0.20, canChance: 0.35,
    propChance: 0.4, flankChance: 0.10, spectacle: 0.22,
    pinSkill: 0.3, mashRate: 0.3, respectMs: 2300,
  },
  NORMAL: {
    id: 'NORMAL', label: 'CARD MATCH',
    thinkMs: 400, reactionMs: 260,
    reversalChance: 0.24, reversalWindowScale: 1,
    grabChance: 0.34, aggression: 0.68, specialEagerness: 0.66,
    pinEagerness: 0.8, tauntChance: 0.12, canChance: 0.6,
    propChance: 0.6, flankChance: 0.20, spectacle: 0.38,
    pinSkill: 0.58, mashRate: 0.55, respectMs: 1750,
  },
  BRUTAL: {
    id: 'BRUTAL', label: 'MAIN EVENT',
    thinkMs: 220, reactionMs: 150,
    reversalChance: 0.42, reversalWindowScale: 1.25,
    grabChance: 0.48, aggression: 0.82, specialEagerness: 0.92,
    pinEagerness: 0.95, tauntChance: 0.04, canChance: 0.85,
    propChance: 0.85, flankChance: 0.34, spectacle: 0.52,
    pinSkill: 0.85, mashRate: 0.85, respectMs: 1050,
  },
};
