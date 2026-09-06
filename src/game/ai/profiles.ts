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
    thinkMs: 600, reactionMs: 480, blockChance: 0.12, grappleChance: 0.18,
    aggression: 0.48, specialEagerness: 0.3, pinEagerness: 0.45,
    tauntChance: 0.22, mashRate: 0.25,
  },
  NORMAL: {
    id: 'NORMAL', label: 'CARD MATCH',
    thinkMs: 380, reactionMs: 280, blockChance: 0.3, grappleChance: 0.38,
    aggression: 0.66, specialEagerness: 0.62, pinEagerness: 0.78,
    tauntChance: 0.14, mashRate: 0.55,
  },
  BRUTAL: {
    id: 'BRUTAL', label: 'MAIN EVENT',
    // Aggression sat at 0.92, which kept BRUTAL permanently busy attacking: it
    // never reached the threat check, so the hardest difficulty was also the one
    // that never blocked or reversed. Leaving it room to defend is what makes it
    // read as smarter rather than merely faster.
    thinkMs: 190, reactionMs: 130, blockChance: 0.56, grappleChance: 0.55,
    aggression: 0.82, specialEagerness: 0.95, pinEagerness: 0.95,
    tauntChance: 0.04, mashRate: 0.9,
  },
};
