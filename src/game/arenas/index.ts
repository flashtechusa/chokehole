import type { ArenaConfig } from './types';
import { NOLA_WAREHOUSE_2018 } from './nolaWarehouse2018';

/**
 * Only the vertical-slice arena exists. The rest of the World Tour is researched
 * in docs/RESEARCH_NOTES.md and is deliberately not built yet: the Bible is
 * explicit that no further arenas ship before the first fight is fun (s7, s38).
 */
export const ARENAS: ArenaConfig[] = [NOLA_WAREHOUSE_2018];

export function getArena(id: string): ArenaConfig {
  const a = ARENAS.find((x) => x.id === id);
  if (!a) throw new Error(`unknown arena: ${id}`);
  return a;
}

export { NOLA_WAREHOUSE_2018 };
