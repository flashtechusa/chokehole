import type { ArenaConfig } from '@/game/types';
import { NOLA_WAREHOUSE_2018 } from './nolaWarehouse2018';
import { SUPERCHIEF_2019 } from './superchief2019';
import { TIMES_SQUARE_2024 } from './timesSquare2024';

/**
 * Arena registry. Adding a real Choke Hole venue = add a data file and one line
 * here. See docs/ADDING_AN_ARENA.md.
 */
export const ARENAS: ArenaConfig[] = [
  NOLA_WAREHOUSE_2018,
  SUPERCHIEF_2019,
  TIMES_SQUARE_2024,
];

export const ARENAS_BY_ID: Record<string, ArenaConfig> = Object.fromEntries(
  ARENAS.map((a) => [a.id, a]),
);

export function getArena(id: string): ArenaConfig {
  const a = ARENAS_BY_ID[id];
  if (!a) throw new Error(`Unknown arena id: ${id}`);
  return a;
}

export const DEFAULT_ARENA_ID = NOLA_WAREHOUSE_2018.id;
