/** Deterministic PRNG so the sim harness can reproduce a match exactly. */
export class Rng {
  private s: number;
  constructor(seed = 0x9e3779b9) { this.s = seed >>> 0 || 1; }
  next(): number {
    // xorshift32
    let x = this.s;
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5; x >>>= 0;
    this.s = x;
    return x / 0xffffffff;
  }
  chance(p: number): boolean { return this.next() < p; }
  range(lo: number, hi: number): number { return lo + this.next() * (hi - lo); }
  pick<T>(arr: readonly T[]): T { return arr[Math.floor(this.next() * arr.length)]!; }
}

/** Shared instance for presentation-only randomness. */
export const rng = new Rng(Date.now() >>> 0);
