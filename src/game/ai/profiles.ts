export interface AIProfile {
  id: 'EASY' | 'NORMAL' | 'BRUTAL';
  label: string;
  /** ms between decisions. */
  thinkMs: number;
  /** ms of reaction delay before responding to a telegraphed attack. */
  reactionMs: number;
  /** Probability of attempting a block/reversal when a hit is telegraphed. */
  blockChance: number;
  /** Probability of committing to a grapple when in range. */
  grappleChance: number;
  /** Probability of chasing rather than repositioning. */
  aggression: number;
  /** Probability of using a signature the moment it is available. */
  specialEagerness: number;
  /** Probability of going for a pin when the opponent is down and hurt. */
  pinEagerness: number;
  /** Probability of taunting in a lull. */
  tauntChance: number;
  /** Chance to mash out of grapples/pins per opportunity. */
  mashRate: number;
}

/**
 * Difficulty changes reaction and tendency windows only. No hidden damage or
 * health multipliers — the AI runs the same Fighter/CombatSystem as the player.
 */
export const AI_PROFILES: Record<AIProfile['id'], AIProfile> = {
  EASY: {
    id: 'EASY', label: 'ROOKIE',
    thinkMs: 520, reactionMs: 420, blockChance: 0.14, grappleChance: 0.22,
    aggression: 0.55, specialEagerness: 0.35, pinEagerness: 0.5,
    tauntChance: 0.18, mashRate: 0.3,
  },
  NORMAL: {
    id: 'NORMAL', label: 'CARD MATCH',
    thinkMs: 320, reactionMs: 230, blockChance: 0.34, grappleChance: 0.42,
    aggression: 0.75, specialEagerness: 0.7, pinEagerness: 0.8,
    tauntChance: 0.1, mashRate: 0.6,
  },
  BRUTAL: {
    id: 'BRUTAL', label: 'MAIN EVENT',
    thinkMs: 190, reactionMs: 130, blockChance: 0.56, grappleChance: 0.55,
    aggression: 0.92, specialEagerness: 0.95, pinEagerness: 0.95,
    tauntChance: 0.04, mashRate: 0.9,
  },
};
