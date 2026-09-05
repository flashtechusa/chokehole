/**
 * Versioned local save. All state is local for the MVP; `StorageAdapter` exists
 * so a cloud backend can be dropped in later without touching game logic.
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
  controlOpacity: number;
  controlScale: number;
  reduceShake: boolean;
  reduceFlash: boolean;
  highContrast: boolean;
  largeText: boolean;
  subtitles: boolean;
  difficulty: 'EASY' | 'NORMAL' | 'BRUTAL';
  matchLengthMin: number;
}

export interface WrestlerRecord {
  wins: number;
  losses: number;
  bestRating: number;
  bestHeat: number;
}

export const SAVE_VERSION = 1;

export interface SaveData {
  version: number;
  settings: GameSettings;
  unlockedWrestlers: string[];
  unlockedArenas: string[];
  tourCompleted: string[];
  records: Record<string, WrestlerRecord>;
  totalWins: number;
  totalMatches: number;
}

const KEY = 'chokehole.save.v1';

export const DEFAULT_SETTINGS: GameSettings = {
  music: 0.55,
  sfx: 0.85,
  announcer: 0.8,
  muted: false,
  controlOpacity: 0.8,
  controlScale: 1,
  reduceShake: false,
  reduceFlash: false,
  highContrast: false,
  largeText: false,
  subtitles: true,
  difficulty: 'NORMAL',
  matchLengthMin: 5,
};

function defaults(): SaveData {
  return {
    version: SAVE_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    unlockedWrestlers: ['jassy', 'raid'],
    unlockedArenas: ['nola-warehouse-2018'],
    tourCompleted: [],
    records: {},
    totalWins: 0,
    totalMatches: 0,
  };
}

export class SaveManager {
  private static _i: SaveManager | null = null;
  static get instance(): SaveManager {
    if (!this._i) this._i = new SaveManager(new LocalStorageAdapter());
    return this._i;
  }

  private adapter: StorageAdapter;
  private data: SaveData;

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter;
    this.data = this.load();
  }

  private load(): SaveData {
    const raw = this.adapter.read(KEY);
    if (!raw) return defaults();
    try {
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      return this.migrate(parsed);
    } catch {
      return defaults();
    }
  }

  /** Forward-compatible merge; unknown/older shapes fall back to defaults. */
  private migrate(input: Partial<SaveData>): SaveData {
    const base = defaults();
    return {
      version: SAVE_VERSION,
      settings: { ...base.settings, ...(input.settings ?? {}) },
      unlockedWrestlers: Array.from(new Set([...base.unlockedWrestlers, ...(input.unlockedWrestlers ?? [])])),
      unlockedArenas: Array.from(new Set([...base.unlockedArenas, ...(input.unlockedArenas ?? [])])),
      tourCompleted: input.tourCompleted ?? [],
      records: input.records ?? {},
      totalWins: input.totalWins ?? 0,
      totalMatches: input.totalMatches ?? 0,
    };
  }

  get(): SaveData { return this.data; }
  get settings(): GameSettings { return this.data.settings; }

  save(): void {
    this.adapter.write(KEY, JSON.stringify(this.data));
  }

  updateSettings(patch: Partial<GameSettings>): void {
    this.data.settings = { ...this.data.settings, ...patch };
    this.save();
  }

  isWrestlerUnlocked(id: string): boolean { return this.data.unlockedWrestlers.includes(id); }
  isArenaUnlocked(id: string): boolean { return this.data.unlockedArenas.includes(id); }

  unlockArena(id: string): boolean {
    if (this.data.unlockedArenas.includes(id)) return false;
    this.data.unlockedArenas.push(id);
    this.save();
    return true;
  }

  unlockWrestler(id: string): boolean {
    if (this.data.unlockedWrestlers.includes(id)) return false;
    this.data.unlockedWrestlers.push(id);
    this.save();
    return true;
  }

  recordMatch(wrestlerId: string, won: boolean, rating: number, heatPeak: number): void {
    const r = this.data.records[wrestlerId] ?? { wins: 0, losses: 0, bestRating: 0, bestHeat: 0 };
    if (won) { r.wins += 1; this.data.totalWins += 1; } else r.losses += 1;
    r.bestRating = Math.max(r.bestRating, rating);
    r.bestHeat = Math.max(r.bestHeat, heatPeak);
    this.data.records[wrestlerId] = r;
    this.data.totalMatches += 1;
    this.save();
  }

  markTourStop(id: string): void {
    if (!this.data.tourCompleted.includes(id)) {
      this.data.tourCompleted.push(id);
      this.save();
    }
  }

  reset(): void {
    this.data = defaults();
    this.save();
  }
}

export const Save = SaveManager.instance;
