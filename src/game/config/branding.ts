/**
 * All title / brand / broadcast strings live here so the collective can rename
 * the game (or fictionalise a venue name for clearance) without touching logic.
 */
export const BRANDING = {
  titleLine1: 'CHOKE',
  titleLine2: 'HOLE',
  subtitle: 'NO HOLES BARRED',
  tagline: 'EXTREME DRAG WRESTLING',
  /** Working title only — Design Bible section 1. */
  fullTitle: 'CHOKE HOLE: NO HOLES BARRED',
  network: 'IBS',
  networkLong: 'INTERGALACTIC BROADCAST SYSTEM',
  liveBug: 'CHOKE HOLE LIVE',
  sponsor: 'SQUELSH',
  sponsorTag: 'THE ENERGY DRINK THAT CALMS YOU DOWN',
  interrupt: 'AN INTERGALACTIC BROADCAST IS INTERRUPTING YOUR DEVICE',
  buildLabel: 'VERTICAL SLICE v0.1 — PLACEHOLDER ART',
} as const;

/** Fake sponsor bumpers. All fictional. */
export const SPONSORS: { name: string; line: string }[] = [
  { name: 'SQUELSH', line: 'THE ENERGY DRINK THAT CALMS YOU DOWN' },
  { name: 'SQUELSH ZERO', line: 'NOW WITH LESS CONSENT' },
  { name: 'PINKSTAR REALTY', line: 'YOUR NEIGHBOURHOOD, OUR PORTFOLIO' },
  { name: 'BIOMECH DENTAL', line: 'TEETH ARE A SUBSCRIPTION' },
  { name: 'VISQUEEN BRAND SHEETING', line: 'WIPE-CLEAN. WATERTIGHT. WILLING.' },
  { name: 'GORLEENYAH LEGAL', line: 'WE OWN THE VERB "TO OWN"' },
];

/** Broadcast lower-third chatter. All fictional. */
export const BROADCAST_LINES: string[] = [
  'SIGNAL INTEGRITY: DEGRADED',
  'THIS BROADCAST IS NOT LICENSED FOR YOUR SPECIES',
  'PLEASE REMAIN SEATED AND HYDRATED',
  'STANDINGS SUBJECT TO BRIBERY',
  'DO NOT ATTEMPT ANY OF THIS AT HOME',
  'TECHNICAL DIFFICULTIES ARE PART OF THE SHOW',
  'AUDIENCE MEMBERS ARE UNINSURED',
];
