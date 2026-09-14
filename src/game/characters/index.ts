import type { WrestlerConfig } from './types';
import { JASSY } from './jassy';
import { RAID } from './raid';

export const ROSTER: WrestlerConfig[] = [JASSY, RAID];

export const BY_ID: Record<string, WrestlerConfig> = Object.fromEntries(
  ROSTER.map((w) => [w.id, w]),
);

export function getWrestler(id: string): WrestlerConfig {
  const w = BY_ID[id];
  if (!w) throw new Error(`unknown wrestler: ${id}`);
  return w;
}

export { JASSY, RAID };
