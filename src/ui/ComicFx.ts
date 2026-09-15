import { h, toggle } from './dom';

const clamp01 = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/**
 * The comic panel layer: speed lines, an impact wash and a halftone screen.
 *
 * The game already had 3D impact cards, shards and a shockwave, all of which
 * live in the world. What it did not have is the part of the genre that happens
 * to the PAGE rather than to the fight — the focus lines converging on a hit,
 * the colour that floods the panel behind it, the printed dot screen over a big
 * spot. Those are flat, screen-space and belong in the DOM.
 *
 * Everything here animates transform and opacity only. The conic gradient that
 * draws the focus lines is rasterised once and then composited, which is the
 * difference between free and a repaint of the whole screen on every hit.
 */
export class ComicFx {
  readonly root: HTMLElement;
  private lines: HTMLElement;
  private wash: HTMLElement;
  private dots: HTMLElement;
  /** Two cards, alternating, so a fast second hit does not cut the first off. */
  private cards: HTMLElement[];
  private cardWords: HTMLElement[];
  private cardAnims: (Animation | null)[] = [null, null];
  private nextCard = 0;
  private dotTimer = 0;
  private reduceFlash = false;
  private lineAnim: Animation | null = null;
  private washAnim: Animation | null = null;

  constructor() {
    this.root = h('div', 'comic');
    this.lines = h('div', 'comic-lines');
    this.wash = h('div', 'comic-wash');
    this.dots = h('div', 'comic-dots');
    this.cards = [h('div', 'comic-card'), h('div', 'comic-card')];
    this.cardWords = this.cards.map((c) => {
      const w = h('span', 'word');
      c.appendChild(w);
      return w;
    });
    this.root.append(this.wash, this.lines, this.dots, ...this.cards);
  }

  setReduceFlash(v: boolean): void {
    this.reduceFlash = v;
    if (v) this.clear();
  }

  /**
   * Focus lines converging on a point, given in fractions of the canvas.
   *
   * The element is a square larger than the viewport with its gradient centred
   * on itself, so aiming it is a translate of its own centre onto the hit — the
   * gradient is rasterised once per burst and composited from there.
   *
   * The focus is clamped away from the edges. Partly so the square still covers
   * the far corner at the end of the animation, and partly because lines
   * converging on the rim of the screen point at nothing: the fight is in the
   * middle of the frame and that is where the eye should be sent.
   */
  speedLines(strength: number, nx: number, ny: number): void {
    if (this.reduceFlash || strength <= 0) return;
    const s = Math.min(1, strength);
    const cx = clamp01(nx, 0.18, 0.82) * window.innerWidth;
    const cy = clamp01(ny, 0.18, 0.82) * window.innerHeight;
    const base = `translate(calc(-50% + ${cx.toFixed(0)}px), calc(-50% + ${cy.toFixed(0)}px))`;
    this.lineAnim?.cancel();
    this.lineAnim = this.lines.animate(
      [
        {
          opacity: 0.9 * s,
          transform: `${base} scale(${(1.45 - s * 0.12).toFixed(2)})`,
          easing: 'cubic-bezier(0.12, 0.8, 0.3, 1)',
        },
        { opacity: 0.72 * s, transform: `${base} scale(1.16)`, offset: 0.35, easing: 'ease-in' },
        { opacity: 0, transform: `${base} scale(1.1)` },
      ],
      // The easing belongs on the keyframes, not here. An ease-out on the whole
      // effect makes a four-frame animation spend three of them on its own fade.
      { duration: 210 + s * 260, easing: 'linear', fill: 'forwards' },
    );
  }

  /**
   * The panel floods with the attacker's colour for a beat. This is what sells
   * a heavy landing on a phone, where the 3D burst is only a few hundred
   * pixels across and the eye may not be on it.
   */
  impact(color: string, strength: number): void {
    if (this.reduceFlash || strength <= 0) return;
    const s = Math.min(1, strength);
    this.wash.style.setProperty('--wash', color);
    this.washAnim?.cancel();
    this.washAnim = this.wash.animate(
      [
        { opacity: 0.5 * s, easing: 'ease-out' },
        { opacity: 0.22 * s, offset: 0.3, easing: 'ease-in' },
        { opacity: 0 },
      ],
      { duration: 130 + s * 200, easing: 'linear', fill: 'forwards' },
    );
  }

  /**
   * The shouted noise over the contact, in screen space at a size you can read.
   *
   * It lands hard and slightly over-sized, settles, then lifts and fades — the
   * beat a comic panel gets, not an ease-in. `nx`/`ny` are canvas fractions.
   */
  card(text: string, accent: string, nx: number, ny: number, strength: number): void {
    if (!text || this.reduceFlash) return;
    const s = Math.min(1, Math.max(0.35, strength));
    const i = this.nextCard;
    this.nextCard = 1 - i;
    const el = this.cards[i]!;
    const word = this.cardWords[i]!;
    word.textContent = text;
    word.style.setProperty('--len', String(Math.max(4, text.length)));
    el.style.setProperty('--card-accent', accent);
    // Lifted off the contact point, because the contact point is a torso and a
    // card centred on it hides the wrestler being hit. Kept clear of the top
    // and bottom edges so the noise never lands under the health bars or the
    // buttons.
    const cx = clamp01(nx, 0.2, 0.8) * window.innerWidth;
    // Well clear of the action. The card is aimed at the contact point, which
    // is exactly where both wrestlers are, so a small lift still landed it on
    // top of them; it lives in the empty band between the HUD and the top rope.
    const cy = clamp01(ny - 0.30, 0.21, 0.42) * window.innerHeight;
    const at = (k: number): string =>
      `translate(calc(-50% + ${cx.toFixed(0)}px), calc(-50% + ${(cy - k).toFixed(0)}px))`;
    const tilt = (i === 0 ? 1 : -1) * (3 + s * 4);
    this.cardAnims[i]?.cancel();
    const settle = (tilt * 0.4).toFixed(1);
    this.cardAnims[i] = el.animate(
      [
        {
          opacity: 1,
          transform: `${at(0)} rotate(${tilt}deg) scale(${(0.55 + s * 0.55).toFixed(2)})`,
          // Overshoot on the way in: a comic panel lands, it does not arrive.
          easing: 'cubic-bezier(0.2, 1.5, 0.45, 1)',
        },
        {
          opacity: 1,
          transform: `${at(4)} rotate(${settle}deg) scale(${(0.72 + s * 0.5).toFixed(2)})`,
          offset: 0.16,
          easing: 'linear',
        },
        {
          opacity: 1,
          transform: `${at(10)} rotate(${settle}deg) scale(${(0.7 + s * 0.48).toFixed(2)})`,
          offset: 0.62,
          easing: 'ease-in',
        },
        {
          opacity: 0,
          transform: `${at(30)} rotate(${settle}deg) scale(${(0.68 + s * 0.46).toFixed(2)})`,
        },
      ],
      // Linear here: the shape of the beat is in the keyframes above. An
      // ease-out on the effect itself spent two thirds of the card's life
      // fading it out, which is why it read as a flicker rather than a card.
      { duration: 420 + s * 320, easing: 'linear', fill: 'forwards' },
    );
  }

  /** A printed dot screen over the frame, for the length of a cinematic spot. */
  halftone(ms: number): void {
    if (this.reduceFlash) return;
    this.dotTimer = Math.max(this.dotTimer, ms);
    toggle(this.dots, 'on', true);
  }

  update(dt: number): void {
    if (this.dotTimer > 0) {
      this.dotTimer -= dt;
      if (this.dotTimer <= 0) toggle(this.dots, 'on', false);
    }
  }

  clear(): void {
    this.dotTimer = 0;
    toggle(this.dots, 'on', false);
    this.lineAnim?.cancel();
    this.washAnim?.cancel();
    this.lineAnim = null;
    this.washAnim = null;
    this.lines.style.opacity = '0';
    this.wash.style.opacity = '0';
    for (let i = 0; i < this.cardAnims.length; i++) {
      this.cardAnims[i]?.cancel();
      this.cardAnims[i] = null;
      this.cards[i]!.style.opacity = '0';
    }
  }
}
