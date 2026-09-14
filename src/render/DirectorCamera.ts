import type { Scene } from '@babylonjs/core/scene';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TUNING } from '@/game/config/tuning';
import { RING } from '@/game/combat/ring';
import { clamp, damp, lerp } from '@/game/util/math';

export type CamMode =
  | 'PLAY' | 'PIN' | 'SIGNATURE' | 'FINISHER' | 'VICTORY' | 'ENTRANCE' | 'NEARFALL';

export interface CamTarget { x: number; y: number; z: number }



/**
 * A FIXED broadcast hard camera.
 *
 * It sits outside the ring, up at about twenty degrees, and looks down across
 * the mat — the shot every wrestling game uses, and the one the genre reference
 * (Action Arcade Wrestling) uses. The near ropes cross the fighters at the
 * ankle and frame the bottom of the picture; the far ropes and the crowd sit
 * behind them. A small swing off dead-on lets you see a corner post, which is
 * what tells you the ring is a real object rather than a backdrop.
 *
 * It is a PERSPECTIVE camera. An orthographic pass flattened the ring into a
 * diagram: parallel ropes, equal-sized near and far posts, no sense of a box to
 * fight inside. What makes this game 2.5D is that the SIMULATION runs on a line
 * (see combat/ring.ts), not that the projection is flat.
 *
 * During normal play the angle never changes. It pans laterally with the action
 * and zooms inside a tight range — nothing else. Cinematic modes may move the
 * camera, and always return to exactly the same gameplay framing.
 */
export class DirectorCamera {
  readonly cam: UniversalCamera;
  mode: CamMode = 'PLAY';

  private yaw = TUNING.camera.yaw;
  private dist = TUNING.camera.maxDist;
  private pitch = TUNING.camera.pitch;
  private look = new Vector3(0, TUNING.camera.lookHeight, 0);
  private pos = new Vector3(0, 3, -8);

  private punchAmount = 0;
  private shake = 0;
  private modeTimer = 0;
  private orbit = 0;
  private focus: CamTarget | null = null;
  private reduceShake = false;

  constructor(scene: Scene) {
    this.cam = new UniversalCamera('director', new Vector3(0, 3, -8), scene);
    this.cam.minZ = 0.1;
    this.cam.maxZ = 120;
    this.cam.fov = TUNING.camera.fov;
    // No manual camera control anywhere in the game.
    this.cam.inputs.clear();
    scene.activeCamera = this.cam;
  }


  setReduceShake(v: boolean): void { this.reduceShake = v; }

  /** The gameplay yaw. Input is rotated by this so the stick stays consistent. */
  get yawNow(): number { return TUNING.camera.yaw; }

  punch(amount: number): void {
    this.punchAmount = Math.min(1.6, this.punchAmount + amount);
    if (!this.reduceShake) this.shake = Math.min(1, this.shake + amount * 0.6);
  }

  setMode(mode: CamMode, focus?: CamTarget): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.modeTimer = 0;
    this.orbit = 0;
    this.focus = focus ?? null;
  }

  setFocus(focus: CamTarget | null): void { this.focus = focus; }

  update(dt: number, a: CamTarget, b: CamTarget, outside = false): void {
    this.modeTimer += dt;
    const T = TUNING.camera;

    const midX = (a.x + b.x) * 0.5;
    const spreadX = Math.abs(a.x - b.x);
    const meanY = (a.y + b.y) * 0.5;
    const spreadY = Math.abs(a.y - b.y);

    // --- the stable gameplay framing ---
    let wantYaw = T.yaw;
    let wantDist = clamp(T.minDist + spreadX * T.spreadZoom, T.minDist, T.maxDist)
      + spreadY * T.verticalZoom
      + (outside ? T.outsidePull : 0);
    let wantPitch = T.pitch;
    /*
     * The look point follows the pair's height, partially. Standing on the mat
     * is the reference, so ordinary play is unaffected; a climb lifts it, and
     * two bodies on the floor drop it. Someone out on the floor is a whole
     * mat-height down, and gets an extra drop on top.
     */
    let lookY = T.lookHeight
      + (meanY - TUNING.ring.matY) * T.verticalFollow
      + spreadY * T.verticalLift;
    // Full bias from mid-ring rightwards, tapering to nothing at the left rope.
    const biasT = clamp((midX + T.panLimit) / T.panLimit, 0, 1);
    let lookX = clamp(midX, -T.panLimit, T.panLimit) + T.lookBias * biasT;
    // The fight is on a line, so there is no depth to follow.
    let lookZ = RING.playZ;
    let follow = T.follow;

    switch (this.mode) {
      case 'ENTRANCE':
        // An establishing shot, not a diorama: wide enough to say "here is the
        // room", close enough that the wrestlers still read as people.
        wantDist = 8.4;
        wantPitch = 0.42;
        wantYaw = T.yaw - 0.10 + Math.sin(this.modeTimer / 1500) * 0.07;
        follow = 1.8;
        break;

      case 'SIGNATURE':
        // A push in and a small step round, not a spin. The point of a fixed
        // hard camera is that it stays the fixed hard camera; drama comes from
        // the zoom, the slow motion and the lighting, not from moving the shot
        // far enough that the player has to relearn left and right.
        wantYaw = T.yaw + 0.14;
        wantDist = 6.5;
        wantPitch = 0.31;
        lookY = 2.08;
        follow = 6.5;
        if (this.focus) { lookX = this.focus.x + T.lookBias * biasT; }
        break;

      case 'FINISHER': {
        // The one place the camera moves for its own sake.
        this.orbit += dt / 1000;
        wantYaw = T.yaw + 0.10 + Math.sin(this.orbit * 1.6) * 0.12;
        wantDist = clamp(6.4 + spreadX * 0.15, 6.0, 7.8);
        wantPitch = lerp(0.55, 0.28, clamp(this.modeTimer / 1500, 0, 1));
        lookY = 2.00;
        follow = 4.2;
        if (this.focus) { lookX = this.focus.x + T.lookBias * biasT; }
        break;
      }

      case 'NEARFALL':
        // Snap in tight on the kickout. Short and violent.
        wantDist = 5.9;
        wantPitch = 0.30;
        lookY = 1.74;
        follow = 9;
        if (this.focus) { lookX = this.focus.x + T.lookBias * biasT; }
        break;

      case 'PIN':
        wantDist = 6.3;
        wantPitch = 0.38;
        lookY = 1.78;
        follow = 5.0;
        if (this.focus) { lookX = this.focus.x + T.lookBias * biasT; }
        break;

      case 'VICTORY': {
        this.orbit += dt / 1000;
        const f = this.focus;
        if (f) { lookX = f.x + T.lookBias * biasT; }
        wantYaw = T.yaw + Math.sin(this.orbit * 0.9) * 0.14;
        wantDist = 7.4;
        wantPitch = 0.36;
        lookY = 2.20;
        follow = 2.6;
        break;
      }
    }

    this.punchAmount = damp(this.punchAmount, 0, T.punchDecay, dt);
    this.shake = damp(this.shake, 0, T.punchDecay * 1.4, dt);

    this.yaw = damp(this.yaw, wantYaw, follow, dt);
    this.dist = damp(this.dist, wantDist - this.punchAmount * 0.55, follow, dt);
    this.pitch = damp(this.pitch, wantPitch, follow, dt);

    this.look.x = damp(this.look.x, lookX, follow, dt);
    this.look.y = damp(this.look.y, lookY, follow, dt);
    this.look.z = damp(this.look.z, lookZ, follow, dt);

    const sx = this.shake * 0.13 * Math.sin(this.modeTimer / 11);
    const sy = this.shake * 0.11 * Math.sin(this.modeTimer / 7 + 1.3);

    /*
     * Distance, elevation, and a small swing off dead-on. The elevation is an
     * ANGLE rather than a height so that raising the look point for a
     * turnbuckle, or dropping it for a body on the floor, tilts the shot with
     * the action instead of flattening it.
     */
    const flat = Math.cos(this.pitch) * this.dist;
    this.pos.x = this.look.x + Math.sin(this.yaw) * flat + sx;
    this.pos.z = this.look.z - Math.cos(this.yaw) * flat;
    this.pos.y = this.look.y + Math.sin(this.pitch) * this.dist + sy;

    this.cam.position.copyFrom(this.pos);
    this.cam.setTarget(this.look);
  }
}
