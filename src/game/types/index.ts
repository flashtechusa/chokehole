/**
 * CHOKE HOLE: NO HOLES BARRED — shared content types.
 *
 * Everything the game can be *extended* with (wrestlers, arenas, venues, moves,
 * broadcast copy) is described here as plain data. Adding a performer or a real
 * Choke Hole venue must never require editing MatchScene.
 *
 * NOTE ON THE TWO LAYERS (Design Bible section 4):
 *   RealHistory     -> factual. Never invent. Mark gaps TBD.
 *   everything else -> game fiction. Allowed to be completely insane.
 */

export type Archetype =
  | 'POWER' | 'SPEED' | 'TECHNICAL' | 'CHAOS'
  | 'GRAPPLER' | 'CONTROL' | 'BALANCED' | 'BOSS';

export type ResearchStatus =
  | 'CONFIRMED'
  | 'DATES CONFIRMED; VENUE TBD'
  | 'CONFIRMED; DETAIL TBD'
  | 'USER-CONFIRMED'
  | 'TEAM CONFIRMATION REQUIRED';

/* ------------------------------------------------------------------ *
 * MOVES
 * ------------------------------------------------------------------ */

export type MoveKind = 'light' | 'heavy' | 'grapple' | 'signature' | 'finisher' | 'taunt';

export interface MoveDef {
  id: string;
  /** Shown in the HUD callout and on the character card. Game fiction. */
  name: string;
  kind: MoveKind;
  /** ms before the hitbox opens. The reversal window sits at the end of this. */
  startup: number;
  /** ms the hitbox is live. */
  active: number;
  /** ms of recovery after the hitbox closes. */
  recovery: number;
  damage: number;
  /** Horizontal reach in ring units from the fighter's chest. */
  reach: number;
  /** Vertical (depth) tolerance -- how misaligned the two fighters may be. */
  depthTolerance: number;
  /** Horizontal shove applied to whoever eats it. */
  knockback: number;
  /** ms the victim is stunned. */
  hitstun: number;
  /** Puts the victim on the mat. */
  knockdown?: boolean;
  /** Pops the victim into the air (z velocity). */
  launch?: number;
  /** SQUELSH awarded to the attacker on a clean hit. */
  squelsh: number;
  /** Crowd HEAT awarded on a clean hit. */
  heat: number;
  /** Forward lunge applied to the attacker during startup. */
  lunge?: number;
  /** Animation clip name. Falls back to a generic clip for the kind. */
  anim?: string;
  /** Screen shake magnitude. */
  shake?: number;
  /** Impact-frame colour override (hex). */
  impactTint?: number;
  /** Announcer / broadcast callout text. */
  callout?: string;
  /** Applies a temporary buff to the user (signatures). */
  buff?: FighterBuff;
  /** Cost in SQUELSH. */
  cost?: number;
}

export interface FighterBuff {
  id: string;
  label: string;
  durationMs: number;
  powerMult?: number;
  speedMult?: number;
  reachMult?: number;
  damageTakenMult?: number;
  squelshGainMult?: number;
  tint?: number;
}

/* ------------------------------------------------------------------ *
 * RIG -- procedural placeholder art (see docs/CHARACTER_ASSETS.md)
 * ------------------------------------------------------------------ */

export type FlourishKind =
  | 'bighair' | 'shoulderpads' | 'antennae' | 'carapace' | 'extraArms'
  | 'wings' | 'visor' | 'mandibles' | 'tailStinger' | 'crown' | 'sash';

export interface Flourish {
  kind: FlourishKind;
  color: number;
  color2?: number;
  scale?: number;
}

export interface PropSpec {
  /** Public-facing prop name. Real Choke Hole props must be team-approved. */
  name: string;
  /** One line on what it does mechanically. Game fiction. */
  mechanic: string;
  shape:
    | 'briefcase' | 'canister' | 'syringe' | 'microphone'
    | 'sign' | 'brickphone' | 'none';
  color: number;
  color2?: number;
}

/** Wig silhouette. The single biggest readability cue at phone size. */
export type WigStyle =
  | 'bouffant' | 'beehive' | 'longwaves' | 'bob' | 'flipbob'
  | 'mohawk' | 'ponytail' | 'none';

export interface WigSpec {
  style: WigStyle;
  /** Multiplies the whole hair mass. Drag reads big. */
  volume: number;
  color: number;
  /** Under-layer, roots and fringe. Two-tone wigs read strongly at phone size. */
  color2?: number;
  /** Draw the fringe in `color2` and let it fall over the forehead. */
  darkFringe?: boolean;
}

/**
 * Exaggerated body proportions. These are what make a fighter recognisable in
 * silhouette before any colour is read.
 */
export interface FigureSpec {
  /** Shoulder width multiplier. */
  shoulders: number;
  /** Chest volume. 0 = flat, 1.6 = padded to the ceiling. */
  bust: number;
  /** Waist multiplier. Below 1 is cinched. */
  waist: number;
  /** Hip/pad width multiplier. */
  hips: number;
  /** Leg length multiplier. */
  legs: number;
  /** Platform/heel height in local pixels. */
  heel: number;
}

/** Makeup, drawn large enough to read on a phone. */
export interface FaceSpec {
  lash: number;
  lip: number;
  brow: number;
  /** Eyeshadow. */
  shadow: number;
  /** Set for non-human faces (compound eye, visor plate, muzzle). */
  kind?: 'glam' | 'insect' | 'machine';
}

export interface CostumeSpec {
  /** Silhouette of the outfit over the body. */
  kind: 'blazer' | 'leotard' | 'harness' | 'bodysuit' | 'none';
  /** Fringe / tassels along the hem. */
  fringe?: number;
  belt?: number;
  /** Elbow-length gloves and thigh-high boots read as drag, not sportswear. */
  longGloves?: boolean;
  longBoots?: boolean;
  /** Leg-of-mutton puffed sleeves, drawn as a mass on the upper arm. */
  puffSleeves?: number;
  /** Shirt collar behind the neck. */
  collar?: number;
  /** Necktie hanging down the chest. */
  tie?: number;
  /** Sash knotted at the hip. */
  sashKnot?: number;
}

export interface RigSpec {
  /** Overall body scale. */
  scale: number;
  /** Body mass -- widens torso and limbs. */
  bulk: number;
  skin: number;
  outfit: number;
  outfitAlt: number;
  trim: number;
  boots: number;
  gloves: number;
  hair: number;
  /** Rim light colour used for the readable-silhouette outline. */
  rim: number;
  /** Aura/particle colour for specials. */
  aura: number;
  /** Optional -- sensible defaults are filled in by the renderer. */
  figure?: FigureSpec;
  wig?: WigSpec;
  face?: FaceSpec;
  costume?: CostumeSpec;
  flourishes: Flourish[];
}

/* ------------------------------------------------------------------ *
 * WRESTLER
 * ------------------------------------------------------------------ */

export interface WrestlerStats {
  health: number;
  /** Ring units per second at full walk. */
  speed: number;
  /** Damage multiplier. */
  power: number;
  /** Grapple hold time / throw damage multiplier. */
  grapple: number;
  /** Reversal window multiplier. */
  reversal: number;
  /** SQUELSH meter gain multiplier. */
  squelshGain: number;
}

export interface UnlockRule {
  kind: 'default' | 'winsWith' | 'beat' | 'venue';
  value?: string | number;
  /** Human-readable requirement for the roster screen. */
  label: string;
}

export interface WrestlerConfig {
  id: string;
  /** Display strings are separate from ids -- spellings still need team sign-off. */
  displayName: string;
  tagline: string;
  /** REAL LAYER: written from public sources. Factual, short, original wording. */
  publicPersonaSummary: string;
  /** REAL LAYER: sourcing / confirmation state for the persona blurb. */
  personaResearch: ResearchStatus;
  archetype: Archetype;
  alignment: 'FACE' | 'HEEL' | 'CHAOTIC';
  stats: WrestlerStats;
  moves: Record<'light' | 'heavy' | 'grapple' | 'signature' | 'finisher', MoveDef>;
  /** Second light attack in a chain. Optional. */
  lightAlt?: MoveDef;
  prop?: PropSpec;
  rig: RigSpec;
  /** Procedural voice/sfx character. */
  audio: { pitch: number; grit: number; hype: number };
  /** Entrance + victory + rivalry copy. Game fiction. */
  quotes: { entrance: string; taunt: string[]; win: string[]; lose: string };
  /** Bonus HEAT in specific arenas (game fiction hooks). */
  venueBonus?: { arenaId: string; heatMult: number; note: string }[];
  unlock: UnlockRule;
  /**
   * Optional external art override. When public/assets/characters/<id>/sprite.png
   * and sprite.json exist and this is true, the atlas replaces the procedural rig.
   * See docs/ADDING_A_CHARACTER.md.
   */
  useExternalAtlas?: boolean;
}

/* ------------------------------------------------------------------ *
 * ARENAS
 * ------------------------------------------------------------------ */

export type ArenaEventKind =
  | 'lightFlicker' | 'crowdPress' | 'confettiRig' | 'projectionSwap'
  | 'freezeRay' | 'roulette' | 'marchingBand' | 'none';

export interface ArenaPalette {
  skyTop: number;
  skyBottom: number;
  haze: number;
  structure: number;
  structureDark: number;
  crowd: number;
  crowdGlow: number;
  matCanvas: number;
  matLogo: number;
  apron: number;
  ropes: [number, number, number];
  posts: number;
  lightWarm: number;
  lightCool: number;
  floor: number;
}

export type BackdropLayerKind =
  | 'rafters' | 'brickwall' | 'graffiti' | 'crowd' | 'banners'
  | 'projection' | 'billboards' | 'skyline' | 'trussLights' | 'hotdog'
  | 'gallerywall' | 'barricade' | 'stagerig';

export interface BackdropLayer {
  kind: BackdropLayerKind;
  /** Parallax factor: 0 = painted on the far wall, 1 = locked to the ring. */
  parallax: number;
  y: number;
  height?: number;
  density?: number;
  tint?: number;
  tint2?: number;
  alpha?: number;
}

export interface ArenaConfig {
  id: string;
  /** May need swapping for a generic alternate on clearance. Logic never reads it. */
  displayName: string;
  genericName: string;
  city: string;
  /** REAL LAYER. */
  history: RealHistory;
  /** GAME FICTION: how the place plays. */
  vibe: string;
  palette: ArenaPalette;
  backdrop: BackdropLayer[];
  /** Ring interior half-width in ring units. */
  ringHalfWidth: number;
  /** Depth of the playable ring floor in pixels of screen offset. */
  ringDepth: number;
  crowdIntensity: number;
  event: {
    kind: ArenaEventKind;
    label: string;
    /** Plain-language description shown on the arena card. Game fiction. */
    description: string;
  };
  unlock: UnlockRule;
  broadcastSkin: 'ORIGIN' | 'PORTAL' | 'ARMAGEDDON' | 'TV_LIVE' | 'QASINO';
}

/* ------------------------------------------------------------------ *
 * WORLD TOUR / ARCHIVES -- the real history layer
 * ------------------------------------------------------------------ */

export interface RealHistory {
  /** Real event/show name as publicly documented, or a TBD placeholder. */
  eventName: string;
  venue: string;
  city: string;
  /** Human-readable date or date range as documented. */
  date: string;
  /** Original short summary written from public sources. Never a long quote. */
  note: string;
  research: ResearchStatus;
  /** Public source URLs used for grounding. */
  sources: string[];
}

export interface TourStop {
  id: string;
  order: number;
  chapter: string;
  history: RealHistory;
  /** GAME FICTION objective copy for the match at this stop. */
  fiction: { objective: string; twist: string };
  /** Arena id if the arena is built; null while it is still on the roadmap. */
  arenaId: string | null;
  status: 'PLAYABLE' | 'ROADMAP';
}
