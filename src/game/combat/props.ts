import type { MoveDef, PropDef, Provenance } from './types';
import { C } from '@/game/config/canon';

const A: Provenance = 'GAME_ADAPTATION';
const G: Provenance = 'GAME_ORIGINAL';

const swing = (
  id: string, name: string, provenance: Provenance, damage: number, extra: Partial<MoveDef> = {},
): MoveDef => ({
  id, name, kind: 'prop', clip: 'propSwing', provenance,
  startupMs: 230, activeMs: 165, recoveryMs: 400,
  damage, reach: 1.95, arc: 1.2, knockback: 8.2, hitstunMs: 700,
  knockdown: true, launch: 3.3,
  itGain: 18, heat: 26, reversible: true,
  cameraPunch: 1.5, hitStopMs: 120,
  ...extra,
});

/**
 * Oversized props that turn up at ringside mid-match. CHOKE HOLE's own language
 * is exaggerated weapons and trash advertising, so the props are branded rather
 * than generic — but none of them claims to be a spot anyone has actually
 * performed. Provenance is recorded per prop (GAME_ADAPTATION where the deck
 * establishes the object, GAME_ORIGINAL where the game invented it).
 */
export const RINGSIDE_PROPS: PropDef[] = [
  {
    id: 'prop_squelsh_can', name: 'THE BIG CAN', kind: 'carryable', provenance: A,
    shape: 'can', color: C.squelsh, color2: C.acid, scale: 3.0,
    swing: swing('prop_can_swing', 'SPONSORSHIP DEAL', A, 23, {
      shout: 'DRINK SQUELSH',
    }),
  },
  {
    id: 'prop_sign', name: 'THE FORGED PERMIT', kind: 'carryable', provenance: A,
    shape: 'sign', color: C.bone, color2: C.ink, scale: 2.4,
    swing: swing('prop_sign_swing', 'PERMITTING ISSUE', A, 20, {
      startupMs: 200, recoveryMs: 340, knockback: 7.0,
      shout: 'THIS IS A FASHION SHOW',
    }),
  },
  {
    id: 'prop_pipe', name: 'A LENGTH OF SCAFFOLD', kind: 'carryable', provenance: G,
    shape: 'pipe', color: '#9AA0A8', color2: '#5A5F66', scale: 2.2,
    swing: swing('prop_pipe_swing', 'BUILDING CODE VIOLATION', G, 26, {
      startupMs: 265, recoveryMs: 460, knockback: 9.4, damage: 26,
      shout: 'UNINSURED',
    }),
  },
];
