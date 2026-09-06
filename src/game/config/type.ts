/**
 * Type scale.
 *
 * The design surface is 540px tall and renders at roughly 0.72x on an iPhone in
 * landscape, so a "9px" font in design space is about 6.5 CSS pixels on the
 * actual device — unreadable. Every size therefore goes through `fs()`, which
 * enforces a floor and preserves the hierarchy.
 *
 * Floor is 17 design px ≈ 12.3 CSS px on an iPhone 14 in landscape, which is
 * about the smallest text that is comfortably readable at arm's length.
 *
 * Do not write raw px font sizes. Use `fs(n)` or the named steps.
 */

/** Smallest design-space size we will ever render. */
export const MIN_DESIGN_PX = 17;

/**
 * Maps a nominal size to a phone-safe one. Small sizes are lifted to the floor;
 * display sizes pass through so headlines keep their impact.
 */
export function fsn(nominal: number): number {
  if (nominal >= 34) return nominal;            // display type is already large
  if (nominal >= 26) return Math.round(nominal * 1.12);
  if (nominal >= 20) return Math.round(nominal * 1.3);
  return Math.max(MIN_DESIGN_PX, Math.round(nominal * 1.55));
}

/** Phaser wants a string. */
export const fs = (nominal: number): string => `${fsn(nominal)}px`;

/** Named steps, for new code. */
export const TYPE = {
  micro: fs(9),    // legal/fine print — still readable on a phone
  small: fs(11),
  body: fs(13),
  label: fs(16),
  sub: fs(19),
  h3: fs(26),
  h2: fs(34),
  h1: fs(46),
} as const;
