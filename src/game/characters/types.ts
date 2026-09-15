import type { FighterStats, MoveSet, PropDef, SquelshEffect, TauntDef } from '@/game/combat/types';

export type Alignment = 'HEEL' | 'FACE' | 'CHAOS';

/**
 * Source tiers from Bible s17, applied to persona claims as well as venues.
 * REAL statements must carry one; game-original material is GAME_ORIGINAL.
 */
export type SourceTier =
  | 'DECK_CONFIRMED' | 'PUBLIC_CONFIRMED' | 'TEAM_CONFIRMED' | 'TBD' | 'GAME_ORIGINAL';

export type { Provenance } from '@/game/combat/types';

export interface WrestlerConfig {
  id: string;
  displayName: string;
  tagline: string;
  archetype: string;
  alignment: Alignment;
  /** Canon summary. Must be supportable by the deck or another verified source. */
  canonSummary: string;
  canonSource: SourceTier;
  /** Colour used for this fighter across HUD, callouts and lighting. */
  accent: string;
  stats: FighterStats;
  moves: MoveSet;
  /** Multiple taunts, chosen by context. Taunting is gameplay, not decoration. */
  taunts: TauntDef[];
  /** The wrestler's own oversized prop. */
  prop: PropDef;
  squelsh: SquelshEffect;
  quotes: { entrance: string; win: string; taunt: string[] };
}
