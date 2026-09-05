import type { WrestlerConfig } from '@/game/types';
import { JASSY } from './jassy';
import { RAID } from './raid';

/**
 * Roster registry. Adding a wrestler = add a data file and one line here.
 * See docs/ADDING_A_CHARACTER.md.
 */
export const ROSTER: WrestlerConfig[] = [JASSY, RAID];

export const ROSTER_BY_ID: Record<string, WrestlerConfig> = Object.fromEntries(
  ROSTER.map((w) => [w.id, w]),
);

export function getWrestler(id: string): WrestlerConfig {
  const w = ROSTER_BY_ID[id];
  if (!w) throw new Error(`Unknown wrestler id: ${id}`);
  return w;
}

/**
 * Wave 1 / Wave 2 personas documented in the Design Bible that are NOT yet
 * implemented. Surfaced in the roster screen as "COMING SOON" slots so the
 * shape of the real roster is visible without faking playable characters.
 */
export const ROSTER_ROADMAP: { name: string; archetype: string; wave: string; note: string }[] = [
  { name: 'VISQUEEN', archetype: 'SPEED / CYBORG', wave: 'WAVE 1', note: 'Semi-automatic sex robot; Choke Hole co-host.' },
  { name: 'GORLEENYAH', archetype: 'BOSS / CONTROL', wave: 'WAVE 1', note: 'Intergalactic media mogul; owner and emcee.' },
  { name: 'JOCYLENE CHANGE', archetype: 'TRICKSTER / CHAOS', wave: 'WAVE 1', note: 'Spelling to be confirmed by performer.' },
  { name: 'LAVEAU CONTRAIRE', archetype: 'CONTROL / BUFF', wave: 'WAVE 1', note: 'Televangelist broadcast energy.' },
  { name: 'MISS TOTO', archetype: 'POWER / SPEED', wave: 'WAVE 1', note: 'Bodybuilder Barbie; DJ; giant syringe prop.' },
  { name: "GARLIC JUNIOR / NICOLE'S REVENGE", archetype: 'RANGED / SOUND', wave: 'WAVE 1', note: 'SQUELSH spokeswoman; giant microphone.' },
  { name: 'DEEP SEA DOUBLE', archetype: 'TECHNICAL / ENVIRONMENT', wave: 'WAVE 2', note: 'Cruise-captain climate activist.' },
  { name: 'CANDY PAIN', archetype: 'TECHNICAL / GRAPPLER', wave: 'WAVE 2', note: 'Classic pro-wrestler archetype.' },
  { name: 'GIEZA POKE', archetype: 'TBD WITH PERFORMER', wave: 'WAVE 2', note: 'Hamburg 2021 and Kosovo 2026 rosters.' },
  { name: 'OTTO VON BLOTTO', archetype: 'SPEED / TRICKSTER', wave: 'WAVE 2', note: '"The Baby" diva persona.' },
  { name: 'VIRGINIA SLIM JIM', archetype: 'TBD WITH PERFORMER', wave: 'WAVE 2', note: 'Qasino / Armageddon-era lineups.' },
  { name: 'IVANA DICKIE', archetype: 'TBD WITH PERFORMER', wave: 'KOSOVO PACK', note: 'Spelling varies across listings — confirm.' },
  { name: 'AURAH JENDAFAAQ', archetype: 'TBD WITH PERFORMER', wave: 'KOSOVO PACK', note: '2026 Kosovo featured roster.' },
  { name: 'LOVERBOY NOEL', archetype: 'TBD WITH PERFORMER', wave: 'KOSOVO PACK', note: '2026 Kosovo featured roster.' },
];
