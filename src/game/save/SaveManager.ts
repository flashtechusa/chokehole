import type { Difficulty } from '@/game/ai/profiles';

/**
 * Versioned local save. All state is local for the MVP; StorageAdapter exists so
 * a cloud backend can replace it later without touching game logic (Bible s33).
 */
export interface StorageAdapter {
  read(key: string): string | null;
  write(key: string, value: string): void;
  remove(key: string): void;
}

class LocalStorageAdapter implements StorageAdapter {
  read(key: string): string | null {
    try { return window.localStorage.getItem(key); } catch { return null; }
  }
  write(key: string, value: string): void {
    try { window.localStorage.setItem(key, value); } catch { /* private mode */ }
  }
  remove(key: string): void {
    try { window.localStorage.removeItem(key); } catch { /* ignore */ }
  }
}

export interface GameSettings {
  music: number;
  sfx: number;
  announcer: number;
  muted: boolean;
  reduceShake: boolean;
  reduceFlash: boolean;
  difficulty: Difficulty;
  /** Forced quality tier, or null for automatic. */
  quality: 'LOW' | 'MEDIUM' | 'HIGH' | null;
}

export interface WrestlerRecord {
  wins: number;
  losses: number;
  bestRating: number;
  bestHeat: number;
}

/** v2 drops the 2D prototype's HUD-scaling settings: the UI is HTML now. */
export const SAVE_VERSION = 2;
const KEY = 'chokehole.save.v2';

export interface SaveData {
  version: number;
  settings: GameSettings;
  records: Record<string, WrestlerRecord>;
  totalWins: number;
  totalMatches: number;
  /** Whether the player has seen the controls card. */
  seenHowTo: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  music: 0.55,
  sfx: 0.9,
  announcer: 0.8,
  muted: false,
  reduceShake: false,
  reduceFlash: false,
  difficulty: 'NORMAL',
  quality: null,
};

function defaults(): SaveData {
  return {
    version: SAVE_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    records: {},
    totalWins: 0,
    totalMatches: 0,
    seenHowTo: false,
  };
}

class SaveManager {
  private adapter: StorageAdapter = new LocalStorageAdapter();
  private data: SaveData = defaults();
  private loaded = false;

  setAdapter(a: StorageAdapter): void {
    this.adapter = a;
    this.loaded = false;
  }

  get(): SaveData {
    if (!this.loaded) this.load();
    return this.data;
  }

  get settings(): GameSettings { return this.get().settings; }

  private load(): void {
    this.loaded = true;
    const raw = this.adapter.read(KEY);
    if (!raw) { this.data = defaults(); return; }
    try {
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      // Unknown or older versions fall back to defaults rather than crashing on
      // a shape that no longer exists.
      if (parsed.version !== SAVE_VERSION) { this.data = defaults(); return; }
      this.data = {
        ...defaults(),
        ...parsed,
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
        records: parsed.records ?? {},
      };
    } catch {
      this.data = defaults();
    }
  }

  private flush(): void {
    this.adapter.write(KEY, JSON.stringify(this.data));
  }

  updateSettings(patch: Partial<GameSettings>): void {
    this.get().settings = { ...this.get().settings, ...patch };
    this.flush();
  }

  recordMatch(wrestlerId: string, won: boolean, rating: number, heat: number): void {
    const d = this.get();
    const r = d.records[wrestlerId] ?? { wins: 0, losses: 0, bestRating: 0, bestHeat: 0 };
    if (won) { r.wins += 1; d.totalWins += 1; } else { r.losses += 1; }
    r.bestRating = Math.max(r.bestRating, rating);
    r.bestHeat = Math.max(r.bestHeat, heat);
    d.records[wrestlerId] = r;
    d.totalMatches += 1;
    this.flush();
  }

  markHowToSeen(): void {
    this.get().seenHowTo = true;
    this.flush();
  }

  reset(): void {
    this.data = defaults();
    this.adapter.remove(KEY);
    this.flush();
  }
}

export const Save = new SaveManager();
