/**
 * Canon strings from the CHOKE HOLE 10.3 pitch deck (Bible s3). This file is the
 * only place broadcast copy lives, so nothing invented leaks into the UI.
 */
export const CANON = {
  title1: 'CHOKE',
  title2: 'HOLE',
  subtitle: 'NO HOLES BARRED',
  tagline: 'EXTREME DRAG WRESTLING',
  /** Intergalactic Broadcasting Services: the frame for the whole UI. */
  network: 'I.B.S.',
  networkLong: 'INTERGALACTIC BROADCASTING SERVICES',
  liveBug: 'LIVE',
  sponsor: 'SQUELSH',
  sponsorLine: 'THE ENERGY DRINK THAT CALMS YOU DOWN',
  buildLabel: 'VERTICAL SLICE v2.0 — PLACEHOLDER ART',
} as const;

/** Palette approximated from the deck (Bible s21.2). Not official brand colours. */
export const C = {
  pink: '#E3278F',
  magenta: '#A61D9F',
  acid: '#F1DC0E',
  squelsh: '#8DFF2A',
  blue: '#185DD3',
  ink: '#1E112B',
  inkDeep: '#0E0818',
  orange: '#FF6B2C',
  bone: '#FFF5E8',
  white: '#FFFFFF',
  blood: '#D8203A',
  steel: '#6C5C79',
} as const;

/** Fake sponsor copy for bumpers and transitions, never during live combat. */
export const BUMPERS: { brand: string; line: string }[] = [
  { brand: 'SQUELSH', line: 'THE ENERGY DRINK THAT CALMS YOU DOWN' },
  { brand: 'SQUELSH ZERO', line: 'NOW WITH LESS CONSENT' },
  { brand: 'H.E.R. REAL ESTATE', line: 'WE ALREADY OWN THE BUILDING' },
  { brand: 'I.B.S. LEGAL', line: 'AUDIENCE MEMBERS ARE UNINSURED' },
  { brand: 'CHOKE H.E.R.', line: 'A GOD-FEARING FIGHT CLUB' },
];
