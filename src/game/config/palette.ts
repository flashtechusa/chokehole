/** Shared UI palette. Warehouse rave meets cheap late-night cable. */
export const C = {
  bg: 0x0a0410,
  bgDeep: 0x05020a,
  pink: 0xff2d95,
  hotPink: 0xff5fb0,
  acid: 0xb6ff3a,
  orange: 0xff7a1a,
  cyan: 0x31e7ff,
  purple: 0x7a2bff,
  gold: 0xffd23f,
  blood: 0xd11a3a,
  bone: 0xf3e9dd,
  ink: 0x120a1a,
  white: 0xffffff,
  grime: 0x2b1b2e,
  steel: 0x6c6478,
} as const;

export const CSS = {
  pink: '#ff2d95',
  hotPink: '#ff5fb0',
  acid: '#b6ff3a',
  orange: '#ff7a1a',
  cyan: '#31e7ff',
  purple: '#7a2bff',
  gold: '#ffd23f',
  bone: '#f3e9dd',
  white: '#ffffff',
  ink: '#120a1a',
  bg: '#0a0410',
} as const;

/** Display fonts. Web-safe stacks only — no licensed font files bundled. */
export const FONT = {
  slam: '"Arial Black", "Helvetica Neue", Impact, sans-serif',
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
} as const;
