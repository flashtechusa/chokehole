/**
 * Procedural audio. Every sound here is synthesised at runtime with WebAudio —
 * no commercial music and no third-party samples are bundled (Design Bible
 * sections 22 and 29). Official Choke Hole themes and recorded announcer VO drop in
 * later through `playTheme()` / `playVO()` without touching call sites.
 */
export type SfxName =
  | 'bell' | 'slap' | 'thud' | 'heavy' | 'whoosh' | 'rope' | 'squelsh'
  | 'finisher' | 'pinSlap' | 'crowdPop' | 'static' | 'uiMove' | 'uiSelect'
  | 'uiBack' | 'grapple' | 'reversal' | 'buzz';

export interface AudioSettings {
  music: number;
  sfx: number;
  announcer: number;
  muted: boolean;
}

export class AudioManager {
  private static _instance: AudioManager | null = null;
  static get instance(): AudioManager {
    if (!this._instance) this._instance = new AudioManager();
    return this._instance;
  }

  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private voGain: GainNode | null = null;
  private crowdGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private settings: AudioSettings = { music: 0.55, sfx: 0.85, announcer: 0.8, muted: false };
  private musicTimer: number | null = null;
  private step = 0;
  private nextNoteTime = 0;
  private tempo = 132;
  private musicIntensity = 0;
  private musicOn = false;

  get ready(): boolean { return this.ctx !== null && this.ctx.state === 'running'; }

  /** Must be called from a real user gesture (iOS autoplay policy). */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.settings.muted ? 0 : 1;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.settings.music * 0.5;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.settings.sfx;
      this.sfxGain.connect(this.masterGain);

      this.voGain = this.ctx.createGain();
      this.voGain.gain.value = this.settings.announcer;
      this.voGain.connect(this.masterGain);

      this.crowdGain = this.ctx.createGain();
      this.crowdGain.gain.value = 0;
      this.crowdGain.connect(this.masterGain);

      this.noiseBuffer = this.makeNoise(2.5);
      this.startCrowdBed();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  applySettings(s: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...s };
    if (this.masterGain) this.masterGain.gain.value = this.settings.muted ? 0 : 1;
    if (this.musicGain) this.musicGain.gain.value = this.settings.music * 0.5;
    if (this.sfxGain) this.sfxGain.gain.value = this.settings.sfx;
    if (this.voGain) this.voGain.gain.value = this.settings.announcer;
  }

  getSettings(): AudioSettings { return { ...this.settings }; }

  /* ------------------------------------------------------------------ */

  private makeNoise(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  private startCrowdBed(): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 760;
    bp.Q.value = 0.55;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    src.connect(bp).connect(lp).connect(this.crowdGain!);
    src.start();
  }

  /** 0..1 crowd volume, driven by the HEAT meter. */
  setCrowd(level: number): void {
    if (!this.ctx || !this.crowdGain) return;
    const target = Math.max(0, Math.min(1, level)) * 0.32 * this.settings.sfx;
    this.crowdGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.25);
  }

  /* ---------------------------- SFX -------------------------------- */

  play(name: SfxName, volume = 1): void {
    const ctx = this.ctx;
    if (!ctx || this.settings.muted) return;
    const now = ctx.currentTime;
    const out = this.sfxGain!;

    switch (name) {
      case 'bell': {
        for (const [f, d] of [[1046, 1.6], [1568, 1.1], [2093, 0.8]] as [number, number][]) {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.value = f;
          g.gain.setValueAtTime(0.0001, now);
          g.gain.exponentialRampToValueAtTime(0.35 * volume, now + 0.006);
          g.gain.exponentialRampToValueAtTime(0.0001, now + d);
          o.connect(g).connect(out);
          o.start(now); o.stop(now + d + 0.05);
        }
        break;
      }
      case 'slap': this.noiseBurst(0.09, 2600, 1.2, 0.5 * volume); break;
      case 'thud': {
        this.noiseBurst(0.16, 480, 0.9, 0.55 * volume);
        this.sweep('sine', 180, 46, 0.18, 0.5 * volume);
        break;
      }
      case 'heavy': {
        this.noiseBurst(0.3, 320, 0.8, 0.7 * volume);
        this.sweep('sine', 220, 34, 0.34, 0.75 * volume);
        this.sweep('square', 90, 30, 0.2, 0.2 * volume);
        break;
      }
      case 'grapple': this.noiseBurst(0.2, 900, 0.7, 0.34 * volume); break;
      case 'whoosh': this.noiseBurst(0.22, 1500, 0.5, 0.22 * volume, 'bandpass'); break;
      case 'rope': {
        this.sweep('triangle', 420, 120, 0.22, 0.3 * volume);
        this.noiseBurst(0.12, 1800, 1, 0.2 * volume);
        break;
      }
      case 'reversal': {
        this.sweep('sawtooth', 300, 1200, 0.22, 0.28 * volume);
        this.noiseBurst(0.14, 3200, 1.4, 0.3 * volume);
        break;
      }
      case 'squelsh': {
        this.sweep('sawtooth', 120, 900, 0.55, 0.24 * volume);
        this.sweep('square', 60, 440, 0.55, 0.12 * volume);
        break;
      }
      case 'finisher': {
        for (const f of [110, 138.6, 164.8, 220]) this.tone('sawtooth', f, 0.9, 0.14 * volume);
        this.noiseBurst(0.9, 900, 0.4, 0.4 * volume);
        this.sweep('sine', 400, 40, 0.8, 0.4 * volume);
        break;
      }
      case 'pinSlap': {
        for (let i = 0; i < 3; i++) {
          window.setTimeout(() => this.noiseBurst(0.08, 1600, 1.1, 0.55 * volume), i * 90);
        }
        break;
      }
      case 'crowdPop': {
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const g = ctx.createGain();
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 0.4;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.5 * volume, now + 0.09);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
        src.connect(bp).connect(g).connect(out);
        src.start(now, Math.random() * 1.2); src.stop(now + 1.6);
        break;
      }
      case 'static': this.noiseBurst(0.36, 5200, 0.4, 0.3 * volume, 'highpass'); break;
      case 'buzz': this.sweep('square', 70, 55, 0.4, 0.16 * volume); break;
      case 'uiMove': this.tone('square', 620, 0.05, 0.18 * volume); break;
      case 'uiSelect': {
        this.tone('square', 780, 0.06, 0.2 * volume);
        window.setTimeout(() => this.tone('square', 1180, 0.09, 0.2 * volume), 55);
        break;
      }
      case 'uiBack': this.sweep('square', 520, 220, 0.12, 0.18 * volume); break;
    }
  }

  /** Announcer stab. Recorded VO replaces this later; subtitles are on-screen. */
  playVO(intensity = 1): void {
    const ctx = this.ctx;
    if (!ctx || this.settings.muted) return;
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 700 + intensity * 500;
    f.Q.value = 3;
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(160 + intensity * 60, now);
    o.frequency.linearRampToValueAtTime(120 + intensity * 40, now + 0.18);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.16 * intensity, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    o.connect(f).connect(g).connect(this.voGain!);
    o.start(now); o.stop(now + 0.25);
  }

  private tone(type: OscillatorType, freq: number, dur: number, vol: number): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g).connect(this.sfxGain!);
    o.start(now); o.stop(now + dur + 0.03);
  }

  private sweep(type: OscillatorType, from: number, to: number, dur: number, vol: number): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(from, now);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, to), now + dur);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g).connect(this.sfxGain!);
    o.start(now); o.stop(now + dur + 0.03);
  }

  private noiseBurst(
    dur: number, freq: number, q: number, vol: number,
    type: BiquadFilterType = 'lowpass',
  ): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(Math.max(0.0002, vol), now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(f).connect(g).connect(this.sfxGain!);
    src.start(now, Math.random()); src.stop(now + dur + 0.02);
  }

  /* ---------------------------- music ------------------------------ */

  /** Warehouse-rave bed, generated live. Intensity 0..1 follows crowd HEAT. */
  startMusic(intensity = 0.3): void {
    if (!this.ctx || this.musicOn) return;
    this.musicOn = true;
    this.musicIntensity = intensity;
    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.musicTimer = window.setInterval(() => this.scheduler(), 25);
  }

  setMusicIntensity(v: number): void { this.musicIntensity = Math.max(0, Math.min(1, v)); }

  stopMusic(): void {
    this.musicOn = false;
    if (this.musicTimer !== null) { window.clearInterval(this.musicTimer); this.musicTimer = null; }
  }

  private scheduler(): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicOn) return;
    const spb = 60 / this.tempo / 4;
    while (this.nextNoteTime < ctx.currentTime + 0.12) {
      this.scheduleStep(this.step, this.nextNoteTime);
      this.nextNoteTime += spb;
      this.step = (this.step + 1) % 16;
    }
  }

  private scheduleStep(step: number, when: number): void {
    const ctx = this.ctx!;
    const out = this.musicGain!;
    const I = this.musicIntensity;

    // four-on-the-floor kick
    if (step % 4 === 0) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(140, when);
      o.frequency.exponentialRampToValueAtTime(42, when + 0.11);
      g.gain.setValueAtTime(0.9, when);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 0.24);
      o.connect(g).connect(out);
      o.start(when); o.stop(when + 0.3);
    }
    // offbeat hat
    if (step % 2 === 1) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const f = ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 7000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.1 + I * 0.14, when);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
      src.connect(f).connect(g).connect(out);
      src.start(when, Math.random()); src.stop(when + 0.06);
    }
    // acid bass line
    const notes = [55, 55, 82.4, 55, 65.4, 55, 98, 73.4];
    if (step % 2 === 0) {
      const n = notes[(step / 2) % notes.length]!;
      const o = ctx.createOscillator();
      const f = ctx.createBiquadFilter();
      const g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = n;
      f.type = 'lowpass';
      f.frequency.setValueAtTime(240 + I * 1500, when);
      f.frequency.exponentialRampToValueAtTime(120 + I * 400, when + 0.16);
      f.Q.value = 8 + I * 8;
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(0.16 + I * 0.14, when + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 0.19);
      o.connect(f).connect(g).connect(out);
      o.start(when); o.stop(when + 0.22);
    }
    // stab chord on the turnaround when the crowd is hot
    if (I > 0.5 && step === 14) {
      for (const f of [220, 261.6, 329.6]) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'square';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, when);
        g.gain.exponentialRampToValueAtTime(0.07 * I, when + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, when + 0.18);
        o.connect(g).connect(out);
        o.start(when); o.stop(when + 0.2);
      }
    }
  }

  /** Hook for official Choke Hole themes once licensed audio is supplied. */
  playTheme(_url: string): void {
    // Intentionally unimplemented: no third-party audio ships with this build.
  }
}

export const Audio = AudioManager.instance;
