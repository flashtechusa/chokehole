import type { ArenaConfig } from './types';
import { C } from '@/game/config/canon';

/**
 * THE ORIGINAL WAREHOUSE — New Orleans, 2018. Bible s18.1, DECK CONFIRMED.
 *
 * REAL LAYER: the pitch deck (page 14) establishes CHOKE HOLE's 2018 origin as a
 * trash-built ring in a moldy New Orleans warehouse, with drunk stunts and
 * forged fashion-show permits. The specific building is not established in the
 * supplied research, so this arena is a stylised composite and deliberately does
 * not name a street address or claim a floor plan.
 *
 * GAME FICTION: the bad-wiring spectacle below.
 */
export const NOLA_WAREHOUSE_2018: ArenaConfig = {
  id: 'nola-warehouse-2018',
  displayName: 'THE ORIGINAL WAREHOUSE',
  fallbackDisplayName: 'DIY WAREHOUSE — NEW ORLEANS',
  city: 'New Orleans, Louisiana',
  country: 'USA',
  eventName: 'CHOKE HOLE — ORIGIN ERA',
  year: 2018,
  sourceTier: 'DECK_CONFIRMED',
  historyCard:
    'CHOKE HOLE began in 2018 in a New Orleans warehouse: a trash-built ring, '
    + 'drunk stunts, and permits forged for a fashion show.',
  fictionDisclaimer: 'WHAT FOLLOWS IS AN I.B.S. DRAMATISATION',
  sources: ['CHOKE HOLE 10.3 Pitch Deck, p.14', 'https://www.chokehole.com/'],

  lighting: {
    ambient: '#2A1730',
    ambientIntensity: 0.55,
    keyColor: '#FFD9C0',
    keyIntensity: 1.05,
    rig: [
      { color: C.pink, intensity: 0.85 },
      { color: C.squelsh, intensity: 0.6 },
      { color: C.blue, intensity: 0.55 },
      { color: C.orange, intensity: 0.5 },
    ],
    fogColor: '#180C20',
    fogDensity: 0.028,
    clearColor: '#0B0611',
  },

  crowd: {
    rows: 3,
    density: 26,
    colors: ['#3A1F45', '#5A2A55', '#2A3050', '#4A2038', '#233043'],
    pressIn: 0.55,
  },

  spectacle: {
    id: 'bad-wiring',
    label: 'BAD WIRING',
    description:
      'GAME FICTION: at high crowd heat the DIY lighting rig browns out and '
      + 'strobes, and the audience presses in over the ropes.',
  },
};
