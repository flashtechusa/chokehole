import type { Proportions } from '@/anim/bones';

/**
 * How a wrestler is drawn, flat.
 *
 * This is deliberately NOT the 3D RigSpec with a different palette. That spec
 * described a body assembled from primitives and lit; this one describes a
 * cut-out — which shapes, in which flat colours, with the ink line doing the
 * work that lighting used to. The two have almost nothing in common beyond
 * proportions.
 *
 * Everything here is read off the pitch deck's character pages.
 */
export interface Palette2D {
  skin: string;
  skinShade: string;
  hair: string;
  hairHi: string;
  /** The costume's dominant colour. */
  main: string;
  mainHi: string;
  /** The second costume colour: what breaks the silhouette up. */
  alt: string;
  altHi: string;
  accent: string;
  trim: string;
  boot: string;
  ink: string;
  eye: string;
  mouth: string;
}

export interface Figure2D {
  id: string;
  proportions: Proportions;
  palette: Palette2D;
  head: 'glam' | 'insect';
  /** Chin-length wedge with a blunt fringe, per the deck. */
  hair: 'bob' | 'none';
  costume: {
    /** Puffed shoulders and a sleeve running to the wrist. */
    puffJacket?: boolean;
    /** A scarf knotted at the throat, in the accent colour. */
    scarf?: boolean;
    /** A wide waistband in the accent colour. */
    beltBand?: boolean;
    /** Patent bodice with a bust. */
    bodice?: boolean;
    /** Studs down the jacket front. */
    studs?: boolean;
    /** Fishnet over the legs. */
    fishnets?: boolean;
    /** A lightning bolt down the FRONT of the torso, per the deck. */
    boltFront?: boolean;
    /** Scale texture over the suit. */
    scales?: boolean;
    /** Thin extra limbs off the chest and spine. */
    extraArms?: number;
    /** Spikes fanning back off the skull. */
    spikes?: boolean;
    /** A ring of teeth round an open maw. */
    maw?: boolean;
  };
}

/*
 * JASSY.
 *
 * Deck page: a DARK chin-length bob with a blunt fringe -- not the blonde
 * bouffant an earlier pass built off a misread of the loose reference photos,
 * and the single most identifying thing about her. Hot pink puff-sleeve patent
 * jacket over a black patent bodice, an orange scarf knotted at the throat and
 * an orange waistband, gold studs, black gloves, platform boots.
 */
export const JASSY_2D: Figure2D = {
  id: 'p1',
  /*
   * Cartoon proportions, not anatomical ones. The deck's characters are camp
   * and top-heavy: a big head, a short strong leg, a wide shoulder. Realistic
   * proportions -- a head a seventh of the height, legs at 46% -- came out
   * spindly and small-faced, and the face is the whole point of drawing them
   * in profile.
   */
  proportions: {
    height: 1.95, shoulderW: 0.50, hipW: 0.50,
    torsoLen: 0.66, legLen: 0.78, armLen: 0.62,
    headR: 0.20, neckLen: 0.06, heel: 0.15, hunch: 0.02, bulk: 1.0,
  },
  palette: {
    skin: '#F6E0CC', skinShade: '#DCB79B',
    hair: '#1B141F', hairHi: '#42304A',
    main: '#120F18', mainHi: '#332B40',      // black patent
    alt: '#F0479E', altHi: '#FF86C6',        // hot pink jacket
    accent: '#FF8A1F',                        // scarf and waistband
    trim: '#F5C542',                          // gold studs
    boot: '#120F18',
    ink: '#120A18',
    eye: '#140E1A',
    mouth: '#8E1E4A',
  },
  head: 'glam',
  hair: 'bob',
  costume: {
    puffJacket: true, scarf: true, beltBand: true, bodice: true,
    studs: true, fishnets: true,
  },
};

/*
 * RAID.
 *
 * Deck page: a green scaled bug-boy, the yellow lightning bolt down the FRONT
 * of the torso (the build had it on his back), a magenta maw ringed with teeth,
 * and orange spikes fanning back off the skull.
 */
export const RAID_2D: Figure2D = {
  id: 'p2',
  proportions: {
    height: 1.88, shoulderW: 0.62, hipW: 0.54,
    torsoLen: 0.70, legLen: 0.72, armLen: 0.66,
    headR: 0.23, neckLen: 0.04, heel: 0.07, hunch: 0.13, bulk: 1.22,
  },
  palette: {
    skin: '#6FD418', skinShade: '#3F8E12',
    hair: '#2F6A0E', hairHi: '#54A317',
    main: '#6FD418', mainHi: '#95E84A',
    alt: '#3F8E12', altHi: '#63B822',
    accent: '#F7E220',                        // the bolt
    trim: '#FF8A1F',                          // spikes
    boot: '#C8F03A',
    ink: '#0E1A06',
    eye: '#16260C',
    mouth: '#E8318C',                         // magenta maw
  },
  head: 'insect',
  hair: 'none',
  costume: {
    boltFront: true, scales: true, extraArms: 2, spikes: true, maw: true,
  },
};

export const FIGURES: Record<string, Figure2D> = { jassy: JASSY_2D, raid: RAID_2D };
