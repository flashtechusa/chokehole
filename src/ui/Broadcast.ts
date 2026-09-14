import { BUMPERS, CANON } from '@/game/config/canon';
import { h, toggle } from './dom';
import { rng } from '@/game/util/rng';

/**
 * The I.B.S. layer. CHOKE HOLE's violence is supposed to be funny, and the joke
 * is that a galactic television network is barely holding the broadcast
 * together — so big moments tear the signal and the censor bar drops in.
 *
 * It is deliberately restrained during ordinary combat: this runs on spikes,
 * not continuously (Bible s25).
 */
export class Broadcast {
  readonly root: HTMLElement;
  private glitch: HTMLElement;
  private censor: HTMLElement;
  private blackout: HTMLElement;
  private spot: HTMLElement;
  private spotName: HTMLElement;
  private spotShout: HTMLElement;
  private glitchTimer = 0;
  private censorTimer = 0;
  private spotTimer = 0;
  private reduceFlash = false;

  constructor() {
    this.root = h('div');
    this.blackout = h('div', 'blackout');
    this.spot = h('div', 'spot');
    this.spot.appendChild(h('div', 'spot-burst'));
    this.spotName = h('div', 'spot-name');
    this.spotShout = h('div', 'spot-shout');
    this.spot.append(this.spotName, this.spotShout);
    this.glitch = h('div', 'glitch');
    this.censor = h('div', 'censor');
    this.root.append(this.blackout, this.spot, this.glitch, this.censor);
  }

  /**
   * A signature or finisher spot: the arena drops out, a slammed title card
   * lands, and the wrestler's own colour takes over the screen. A finisher is
   * supposed to look like the broadcast has lost control of itself.
   */
  showSpot(kind: 'signature' | 'finisher', name: string, accent: string, shout?: string): void {
    this.spot.style.setProperty('--spot-accent', accent);
    toggle(this.spot, 'finisher', kind === 'finisher');
    this.spotName.textContent = name;
    this.spotShout.textContent = shout ?? '';
    this.spotShout.style.display = shout ? '' : 'none';
    toggle(this.spot, 'on', true);
    if (!this.reduceFlash) toggle(this.blackout, 'on', kind === 'finisher');
    this.spotTimer = kind === 'finisher' ? 2100 : 1200;
    this.tear(kind === 'finisher' ? 1 : 0.6);
  }

  setReduceFlash(v: boolean): void {
    this.reduceFlash = v;
    if (v) toggle(this.glitch, 'on', false);
  }

  /** A signal tear. Strength 0..1 sets how long it lasts. */
  tear(strength: number): void {
    if (this.reduceFlash) return;
    this.glitchTimer = Math.max(this.glitchTimer, 90 + strength * 260);
    toggle(this.glitch, 'on', true);
  }

  /**
   * Drops the censor bar over a finisher. The gag is that I.B.S. will broadcast
   * anything except the part you want to see.
   */
  censorBar(ms = 2000): void {
    const lines = [
      'I.B.S. CANNOT SHOW YOU THIS',
      'THIS PORTION HAS BEEN SOLD',
      'SIGNAL SEIZED BY CHOKE H.E.R.',
      'PLEASE ENJOY THIS SQUELSH INSTEAD',
    ];
    this.censor.innerHTML = `${rng.pick(lines)}<span class="small">${CANON.networkLong}</span>`;
    toggle(this.censor, 'on', true);
    this.censorTimer = ms;
  }

  update(dt: number): void {
    if (this.glitchTimer > 0) {
      this.glitchTimer -= dt;
      if (this.glitchTimer <= 0) toggle(this.glitch, 'on', false);
    }
    if (this.censorTimer > 0) {
      this.censorTimer -= dt;
      if (this.censorTimer <= 0) toggle(this.censor, 'on', false);
    }
    if (this.spotTimer > 0) {
      this.spotTimer -= dt;
      if (this.spotTimer <= 0) {
        toggle(this.spot, 'on', false);
        toggle(this.blackout, 'on', false);
      }
    }
  }

  clear(): void {
    this.glitchTimer = 0;
    this.censorTimer = 0;
    this.spotTimer = 0;
    toggle(this.glitch, 'on', false);
    toggle(this.censor, 'on', false);
    toggle(this.spot, 'on', false);
    toggle(this.blackout, 'on', false);
  }
}

/** A fake commercial for the results screen. */
export function bumperCard(): HTMLElement {
  const b = rng.pick(BUMPERS);
  const el = h('div', 'bumper');
  el.appendChild(h('div', 'brand', b.brand));
  el.appendChild(h('div', 'line', b.line));
  el.appendChild(h('div', 'legal', `PAID FOR BY ${CANON.network} · AUDIENCE MEMBERS ARE UNINSURED`));
  return el;
}
