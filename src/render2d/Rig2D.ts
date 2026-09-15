import { buildClips, type Style } from '@/anim/clips';
import {
  blendPose, clearPose, sampleClip, type Clip, type Pose,
} from '@/anim/Pose';
import type { Figure2D } from './art';
import {
  buildSkeleton2D, emptySolution, solve2D, type Bone2D, type Solution,
} from './Skeleton2D';

export interface PlayOpts {
  restart?: boolean;
  speed?: number;
  fadeMs?: number;
  hold?: boolean;
}

/**
 * A wrestler's clip player and skeleton.
 *
 * Deliberately the same play/scrub/clipName surface the 3D rig had, so the
 * state-to-clip mapping -- twenty-odd cases of "which animation is this
 * fighter in" -- carries over from MatchView unchanged. That mapping is game
 * knowledge, not rendering, and rewriting it would have been the easiest place
 * in this whole rework to introduce a bug nobody would notice for weeks.
 */
export class Rig2D {
  readonly fig: Figure2D;
  private bones: Bone2D[];
  private clips: Record<string, Clip>;
  private bias: Pose;
  private sol: Solution = emptySolution();

  private current: Clip;
  private time = 0;
  private speed = 1;
  private hold = false;
  private fadeFrom: Pose | null = null;
  private fadeT = 0;
  private fadeLen = 1;
  private pose: Pose = {};
  private scratch: Pose = {};

  /** Hit flash, 0..1, drawn as a flat white wash over the figure. */
  flash = 0;
  tint: string | null = null;

  constructor(fig: Figure2D, style: Style) {
    this.fig = fig;
    this.bones = buildSkeleton2D(fig.proportions);
    this.clips = buildClips(style);
    this.bias = { spine: [0, 0, fig.proportions.hunch] };
    this.current = this.clips.idle!;
  }

  get clipName(): string { return this.current.name; }

  play(name: string, o: PlayOpts = {}): void {
    const next = this.clips[name];
    if (!next) return;
    this.speed = o.speed ?? 1;
    this.hold = o.hold ?? false;
    if (next === this.current && !o.restart) return;
    const fade = o.fadeMs ?? 90;
    if (fade > 0) {
      this.fadeFrom = { ...this.pose };
      this.fadeT = 0;
      this.fadeLen = fade;
    } else {
      this.fadeFrom = null;
    }
    this.current = next;
    this.time = 0;
  }

  /** Drives a clip from an external 0..1 progress instead of a clock. */
  scrub(name: string, t: number): void {
    const next = this.clips[name];
    if (!next) return;
    if (next !== this.current) { this.current = next; this.fadeFrom = null; }
    this.hold = true;
    this.speed = 0;
    this.time = t * next.duration;
  }

  setFlash(v: number): void { this.flash = v; }
  setTint(hex: string | null): void { this.tint = hex; }

  update(dt: number): Solution {
    this.time += dt * this.speed;
    if (!this.current.loop && !this.hold && this.time > this.current.duration) {
      this.play('idle', { speed: 1 });
    }
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt / 150);

    sampleClip(this.current, this.time, clearPose(this.scratch));
    if (this.fadeFrom) {
      this.fadeT += dt;
      const f = Math.min(1, this.fadeT / this.fadeLen);
      blendPose(this.fadeFrom, this.scratch, f * f * (3 - 2 * f), clearPose(this.pose));
      if (f >= 1) this.fadeFrom = null;
    } else {
      Object.assign(clearPose(this.pose), this.scratch);
    }
    return solve2D(this.bones, this.pose, this.bias, this.sol);
  }

  get solution(): Solution { return this.sol; }
}
