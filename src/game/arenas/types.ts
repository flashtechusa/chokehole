import type { SourceTier } from '@/game/characters/types';

/**
 * Arena record. The REAL layer (history) and the GAME FICTION layer are separate
 * fields and are rendered separately, per Bible s5. Never blend them.
 */
export interface ArenaConfig {
  id: string;
  displayName: string;
  /** Used when a venue name is not cleared for commercial release. */
  fallbackDisplayName: string;
  city: string;
  country: string;
  eventName?: string;
  year?: number;
  sourceTier: SourceTier;
  /** One accurate sentence for the pre-match archive card. */
  historyCard: string;
  /** Marks the dramatisation that follows the archive card. */
  fictionDisclaimer: string;
  sources: string[];
  lighting: LightingProfile;
  crowd: CrowdProfile;
  /** Game-original spectacle. Must never decide a match at random (Bible s20). */
  spectacle: { id: string; label: string; description: string };
}

export interface LightingProfile {
  ambient: string;
  ambientIntensity: number;
  keyColor: string;
  keyIntensity: number;
  /** Practical stage lights ringing the mat. */
  rig: { color: string; intensity: number }[];
  fogColor: string;
  fogDensity: number;
  clearColor: string;
}

export interface CrowdProfile {
  /** Rows of low-poly silhouettes around the ring. */
  rows: number;
  density: number;
  colors: string[];
  /** How far the crowd creeps toward the ring at maximum heat. */
  pressIn: number;
}
