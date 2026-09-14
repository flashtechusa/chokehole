import type { Intent } from '@/game/input/Intent';
import { neutralIntent } from '@/game/input/Intent';
import { h, tapButton, toggle } from './dom';

type Btn = 'attack' | 'grab' | 'special';

/**
 * Left thumb: a floating analog stick that appears wherever you touch, so the
 * player never has to find it. Right thumb: three large buttons and nothing
 * else. No chords, no hold timings, no double-tap to run (Bible s9).
 */
export class TouchPad {
  readonly root: HTMLElement;
  private stickZone: HTMLElement;
  private stick: HTMLElement;
  private knob: HTMLElement;
  private specialBtn: HTMLButtonElement;
  private buttonEls: Record<Btn, HTMLButtonElement>;
  private contextHint: HTMLElement;

  private pointerId: number | null = null;
  private originX = 0;
  private originY = 0;
  private vecX = 0;
  private vecY = 0;
  private readonly radius = 56;

  /** Edge flags, consumed once per simulation step. */
  private pressed: Record<Btn, boolean> = { attack: false, grab: false, special: false };
  private held: Record<Btn, boolean> = { attack: false, grab: false, special: false };
  private keys = new Set<string>();
  private enabled = true;

  constructor() {
    this.root = h('div');

    this.stickZone = h('div', 'stick-zone tap');
    this.stick = h('div', 'stick');
    this.knob = h('div', 'stick-knob');
    this.stick.appendChild(this.knob);
    this.stickZone.appendChild(this.stick);
    this.root.appendChild(this.stickZone);

    const hint = h('div', 'stick-hint mono', 'TOUCH TO MOVE');
    this.root.appendChild(hint);

    const buttons = h('div', 'buttons');
    const mk = (key: Btn, label: string, sub: string, cls: string): HTMLButtonElement => {
      const b = tapButton(label, sub, `btn ${cls} tap`, () => {
        if (!this.enabled) return;
        this.pressed[key] = true;
      });
      b.addEventListener('pointerdown', () => { this.held[key] = true; b.classList.add('down'); });
      const up = (): void => { this.held[key] = false; b.classList.remove('down'); };
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('pointerleave', up);
      buttons.appendChild(b);
      return b;
    };
    this.buttonEls = {
      attack: mk('attack', 'ATTACK', 'TAP TAP TAP', 'btn-attack'),
      grab: mk('grab', 'GRAB', 'THROW / PIN', 'btn-grab'),
      special: mk('special', 'IT', 'TAUNT', 'btn-special'),
    };
    this.specialBtn = this.buttonEls.special;
    this.root.appendChild(buttons);

    // Names what ATTACK will actually do right now. With twenty contextual
    // moves on one button, this is the difference between a deep system and a
    // confusing one.
    this.contextHint = h('div', 'context-hint');
    this.root.appendChild(this.contextHint);

    this.bindStick();
    this.bindKeys();
  }

  setEnabled(v: boolean): void {
    this.enabled = v;
    this.root.style.display = v ? '' : 'none';
    if (!v) this.releaseStick();
  }

  /**
   * Relabels ATTACK for the current context and shows the hint chip. Pass null
   * to fall back to the plain label.
   */
  setAttackContext(label: string | null, sub: string | null): void {
    const b = this.buttonEls.attack;
    const lbl = b.querySelector('.lbl');
    const s = b.querySelector('.sub');
    if (lbl) lbl.textContent = label ?? 'ATTACK';
    if (s) s.textContent = sub ?? 'TAP TAP TAP';
    const special = label !== null;
    toggle(b, 'ctx', special);
    if (special) this.contextHint.textContent = sub ?? '';
    toggle(this.contextHint, 'show', special && !!sub);
  }

  /** Shows what the IT button will actually do right now. */
  setSpecialState(state: 'taunt' | 'signature' | 'finisher'): void {
    const b = this.specialBtn;
    toggle(b, 'sig', state === 'signature');
    toggle(b, 'fin', state === 'finisher');
    const lbl = b.querySelector('.lbl');
    const sub = b.querySelector('.sub');
    if (lbl) {
      lbl.textContent = state === 'finisher' ? 'FINISH' : state === 'signature' ? 'SIGNATURE' : 'IT';
    }
    if (sub) {
      sub.textContent = state === 'finisher' ? 'READY' : state === 'signature' ? 'READY' : 'TAUNT';
    }
  }

  /* ---------------- stick ---------------- */

  private bindStick(): void {
    const z = this.stickZone;
    z.addEventListener('pointerdown', (e) => {
      if (!this.enabled || this.pointerId !== null) return;
      this.pointerId = e.pointerId;
      z.setPointerCapture(e.pointerId);
      this.originX = e.clientX;
      this.originY = e.clientY;
      this.stick.style.left = `${e.clientX}px`;
      this.stick.style.top = `${e.clientY}px`;
      this.stick.classList.add('active');
      this.moveStick(e.clientX, e.clientY);
      e.preventDefault();
    });
    z.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.pointerId) return;
      this.moveStick(e.clientX, e.clientY);
      e.preventDefault();
    });
    const end = (e: PointerEvent): void => {
      if (e.pointerId !== this.pointerId) return;
      this.releaseStick();
    };
    z.addEventListener('pointerup', end);
    z.addEventListener('pointercancel', end);
    z.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private moveStick(x: number, y: number): void {
    let dx = x - this.originX;
    let dy = y - this.originY;
    const d = Math.hypot(dx, dy);
    if (d > this.radius) {
      dx = (dx / d) * this.radius;
      dy = (dy / d) * this.radius;
    }
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    this.vecX = dx / this.radius;
    this.vecY = dy / this.radius;
  }

  private releaseStick(): void {
    this.pointerId = null;
    this.vecX = 0;
    this.vecY = 0;
    this.knob.style.transform = '';
    this.stick.classList.remove('active');
  }

  /* ---------------- keyboard (desktop testing) ---------------- */

  private bindKeys(): void {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      this.keys.add(k);
      if (k === 'j') { this.pressed.attack = true; this.held.attack = true; }
      if (k === 'k') { this.pressed.grab = true; this.held.grab = true; }
      if (k === 'l') { this.pressed.special = true; this.held.special = true; }
    });
    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      this.keys.delete(k);
      if (k === 'j') this.held.attack = false;
      if (k === 'k') this.held.grab = false;
      if (k === 'l') this.held.special = false;
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.held = { attack: false, grab: false, special: false };
      this.releaseStick();
    });
  }

  /**
   * Builds this step's Intent and clears the edge flags. Must be called exactly
   * once per simulation step or presses will be eaten.
   */
  consume(): Intent {
    const i = neutralIntent();

    let kx = 0;
    let ky = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) kx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) kx += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) ky -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) ky += 1;

    // Screen-space stick maps to the mat: right is +X, up-screen is -Z.
    i.moveX = kx !== 0 || ky !== 0 ? kx : this.vecX;
    i.moveY = kx !== 0 || ky !== 0 ? ky : this.vecY;

    i.attack = this.pressed.attack;
    i.grab = this.pressed.grab;
    i.special = this.pressed.special;
    i.anyPress = i.attack || i.grab || i.special;

    this.pressed.attack = false;
    this.pressed.grab = false;
    this.pressed.special = false;
    return i;
  }
}
