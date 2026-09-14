import type { Scene } from '@babylonjs/core/scene';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { buildSkeleton, type Bones, type RigSpec } from './Skeleton';
import { buildBody } from './buildBody';
import { buildClips, type Style } from './clips';
import { applyPose, blendPose, clearPose, sampleClip, type Clip, type Pose } from './Pose';

export interface PlayOpts {
  /** Restart even if this clip is already playing. */
  restart?: boolean;
  speed?: number;
  /** Crossfade length. 0 snaps. */
  fadeMs?: number;
  /** Hold the last frame instead of falling back to idle. */
  hold?: boolean;
}

/**
 * A posed 3D wrestler. Owns its own skeleton, geometry and clip player, and
 * knows nothing about combat: MatchView tells it where to stand and which clip
 * to run. Swapping in an approved GLB later means replacing this class's
 * geometry and clip source, not the game.
 */
export class CharacterRig {
  /**
   * What the world moves. The skeleton's own `root` bone belongs to the pose
   * system, which rewrites its position every frame for clip offsets like a
   * crouch or a lunge — so placing the fighter on that node put both wrestlers
   * at the world origin, sunk into the mat.
   */
  readonly root: TransformNode;
  readonly bones: Bones;
  readonly meshes: Mesh[];
  private material: StandardMaterial;
  private baseEmissive: Color3;
  private clips: Record<string, Clip>;
  private bias: Pose;

  private current: Clip;
  private time = 0;
  private speed = 1;
  private hold = false;

  // crossfade
  private fadeFrom: Pose | null = null;
  private fadeT = 0;
  private fadeLen = 0;

  private pose: Pose = {};
  private scratch: Pose = {};
  private flash = 0;
  private tint: Color3 | null = null;

  constructor(scene: Scene, spec: RigSpec, style: Style, name: string) {
    this.bones = buildSkeleton(scene, spec.proportions, name);
    this.root = new TransformNode(`${name}_holder`, scene);
    this.bones.root.parent = this.root;
    this.meshes = buildBody(scene, this.bones, spec, name);
    this.material = this.meshes[0]!.material as StandardMaterial;
    this.material.unfreeze();
    this.baseEmissive = this.material.emissiveColor.clone();
    this.clips = buildClips(style);
    // The skeleton's neutral hunch is a bias so clips do not have to encode it.
    this.bias = {};
    this.current = this.clips.idle!;
  }

  get clipName(): string { return this.current.name; }
  /** 0..1 through the current clip. */
  get progress(): number {
    return this.current.duration > 0 ? Math.min(1, this.time / this.current.duration) : 1;
  }
  get finished(): boolean { return !this.current.loop && this.progress >= 1; }

  play(name: string, o: PlayOpts = {}): void {
    const clip = this.clips[name];
    if (!clip) return;
    if (clip === this.current && !o.restart) {
      this.speed = o.speed ?? this.speed;
      return;
    }
    const fade = o.fadeMs ?? 110;
    if (fade > 0) {
      this.fadeFrom = { ...this.pose };
      this.fadeT = 0;
      this.fadeLen = fade;
    } else {
      this.fadeFrom = null;
    }
    this.current = clip;
    this.time = 0;
    this.speed = o.speed ?? 1;
    this.hold = o.hold ?? false;
  }

  /** Scrubs a non-looping clip to an explicit 0..1 position (attack playheads). */
  scrub(name: string, t: number): void {
    const clip = this.clips[name];
    if (!clip) return;
    if (clip !== this.current) {
      this.fadeFrom = { ...this.pose };
      this.fadeT = 0;
      this.fadeLen = 90;
      this.current = clip;
      this.hold = true;
    }
    this.time = Math.max(0, Math.min(1, t)) * clip.duration;
    this.speed = 0;
  }

  setFlash(v: number): void { this.flash = v; }
  setTint(hex: string | null): void { this.tint = hex ? Color3.FromHexString(hex) : null; }

  update(dt: number): void {
    this.time += dt * this.speed;
    if (!this.current.loop && !this.hold && this.time > this.current.duration) {
      this.time = this.current.duration;
    }

    sampleClip(this.current, this.time, clearPose(this.scratch));

    if (this.fadeFrom) {
      this.fadeT += dt;
      const f = Math.min(1, this.fadeT / this.fadeLen);
      blendPose(this.fadeFrom, this.scratch, f * f * (3 - 2 * f), clearPose(this.pose));
      if (f >= 1) this.fadeFrom = null;
    } else {
      Object.assign(clearPose(this.pose), this.scratch);
    }

    applyPose(this.bones, this.pose, this.bias, { y: 0 });

    // hit flash and Squelsh corruption both ride the shared material
    const e = this.baseEmissive;
    if (this.flash > 0 || this.tint) {
      const f = this.flash;
      const t = this.tint;
      this.material.emissiveColor.set(
        Math.min(1, e.r + f * 0.9 + (t ? t.r * 0.3 : 0)),
        Math.min(1, e.g + f * 0.9 + (t ? t.g * 0.3 : 0)),
        Math.min(1, e.b + f * 0.9 + (t ? t.b * 0.3 : 0)),
      );
    } else {
      this.material.emissiveColor.copyFrom(e);
    }
  }

  dispose(): void {
    for (const m of this.meshes) m.dispose();
    this.root.dispose(false, true);
  }
}
