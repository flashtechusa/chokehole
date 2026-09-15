import type { MoveDef, MoveKind } from '@/game/combat/types';
import { clamp } from '@/game/util/math';
import { rng } from '@/game/util/rng';

/**
 * How hard a move lands, normalised. Everything that dresses a hit — the card's
 * size, the camera punch, the focus lines, the colour wash — is graded off this
 * one number, so it lives here rather than being written out twice in the
 * renderer and again in the app loop.
 */
export function hitPower(move: MoveDef): number {
  return clamp(move.damage / 38, 0.2, 1.6);
}

/**
 * Comic onomatopoeia for the card that lands over a struck body.
 *
 * The card used to print the first word of the move's name, which gave
 * "Running" for a Running Lariat and "Spinning" for a Spinning Heel Kick — the
 * adjective, never the hit. A move's NAME belongs on the spot card, which
 * already prints it in full and in a size you can read; the card over a body
 * wants a noise.
 *
 * These are invented noises in the general comic register. Nothing here is
 * lifted from another wrestling game's callouts (Bible s23).
 */
const NOISE: Record<MoveKind, readonly string[]> = {
  /** Jabs and stiff-arms carry no card at all: they are the filler between hits. */
  light: [],
  heavy: ['KRAK', 'WHUMP', 'THWAK', 'BOFF'],
  grapple: ['GRRK', 'HRRNK', 'CLNCH'],
  throw: ['HEAVE', 'WHUMF', 'FWOOSH'],
  ground: ['THUD', 'SKRUNCH', 'OOF'],
  running: ['SHUNT', 'KRAM', 'WHAM'],
  rebound: ['TWANG', 'SPRONK', 'BOING'],
  aerial: ['FWAP', 'KRUNSH', 'SPLAT'],
  dive: ['FWOMP', 'KABOOM', 'SPLOOSH'],
  corner: ['CHONK', 'KLONK', 'DOOF'],
  prop: ['KLANG', 'SPANG', 'DONK'],
  signature: ['KABLAM', 'SKRAAK', 'WHAKOOM'],
  finisher: ['KRAKATHOOM', 'THOOM', 'KA-RAKK'],
};

/**
 * The noise for one hit, or '' for a hit that should not get a card.
 * `power` is the hit's normalised force; anything past a solid connect gets a
 * second bang on it, which is the cheapest way to grade a card by size.
 */
export function impactWord(kind: MoveKind, power: number): string {
  const set = NOISE[kind];
  if (!set.length) return '';
  const word = rng.pick(set as string[]);
  if (power >= 1.15) return `${word}!!`;
  if (power >= 0.75) return `${word}!`;
  return word;
}
