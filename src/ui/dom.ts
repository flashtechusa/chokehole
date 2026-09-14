export type El = HTMLElement;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K, cls?: string, text?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
}

export function frag(...nodes: (Node | null | undefined)[]): DocumentFragment {
  const f = document.createDocumentFragment();
  for (const n of nodes) if (n) f.appendChild(n);
  return f;
}

/** Sets a class only when it changes, so we are not thrashing the DOM per frame. */
export function toggle(el: El, cls: string, on: boolean): void {
  if (el.classList.contains(cls) !== on) el.classList.toggle(cls, on);
}

export function setText(el: El, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

/**
 * A button that fires on pointerdown, not click. On a phone a 300ms click delay
 * is the difference between a game that answers you and one that ignores you.
 */
export function tapButton(
  label: string, sub: string | null, cls: string, onTap: () => void,
): HTMLButtonElement {
  const b = h('button', cls);
  const l = h('span', 'lbl', label);
  b.appendChild(l);
  if (sub) b.appendChild(h('span', 'sub', sub));
  const fire = (e: Event): void => {
    e.preventDefault();
    e.stopPropagation();
    onTap();
  };
  b.addEventListener('pointerdown', fire);
  b.addEventListener('contextmenu', (e) => e.preventDefault());
  return b;
}

/** Same, for the big menu buttons where the label markup differs. */
export function menuButton(
  label: string, sub: string | null, cls: string, onTap: () => void,
): HTMLButtonElement {
  const b = h('button', `big-btn ${cls}`);
  b.appendChild(document.createTextNode(label));
  if (sub) b.appendChild(h('span', 'sub', sub));
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); onTap(); });
  b.addEventListener('contextmenu', (e) => e.preventDefault());
  return b;
}
