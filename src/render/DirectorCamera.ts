import type { Scene } from '@babylonjs/core/scene';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TUNING } from '@/game/config/tuning';
import { clamp, damp, lerp } from '@/game/util/math';

export type CamMode =
  | 'PLAY' | 'PIN' | 'SIGNATURE' | 'FINISHER' | 'VICTORY' | 'ENTRANCE' | 'NEARFALL';

export interface CamTarget { x: number; y: number; z: number }

/**
 * A FIXED three-quarter wrestling camera.
 *
 * During normal play the angle never changes. It pans laterally with the
 * action, shifts a little with depth, and zooms inside a tight range — nothing
 * else. Continuous orbiting is what made free-3D play hard to read: the
 * player's sense of left and right moved with the camera, so the stick stopped
 * meaning anything stable.
 *
 * Cinematic modes may move the camera anywhere. They always return to exactly
 * the same gameplay angle, so the familiar view is never lost for long.
 */
export class DirectorCamera {
  readonly cam: UniversalCamera;
  mode: CamMode = 'PLAY';

  private yaw = TUNING.camera.yaw;
  private dist = TUNING.camera.maxDist;
  private height = TUNING.camera.height;
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
    this.cam.maxZ = 90;
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
    const midZ = (a.z + b.z) * 0.5;
    const spreadX = Math.abs(a.x - b.x);
    const meanY = (a.y + b.y) * 0.5;
    const spreadY = Math.abs(a.y - b.y);

    // --- the stable gameplay framing ---
    let wantYaw = T.yaw;
    let wantDist = clamp(T.minDist + spreadX * T.spreadZoom, T.minDist, T.maxDist)
      + spreadY * T.verticalZoom
      + (outside ? T.outsidePull : 0);
    let wantHeight = T.height;
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
    let lookZ = midZ * T.depthShift;
    let follow = T.follow;

    switch (this.mode) {
      case 'ENTRANCE':
        // An establishing shot, not a diorama: wide enough to say "here is the
        // room", close enough that the wrestlers still read as people.
        wantDist = 6.2;
        wantHeight = 2.9;
        wantYaw = T.yaw - 0.22 + Math.sin(this.modeTimer / 1500) * 0.16;
        follow = 1.8;
        break;

      case 'SIGNATURE':
        // One decisive shift, not a spin: swing to the other shoulder and hold.
        wantYaw = T.yaw + 0.5;
        wantDist = 5.2;
        wantHeight = 2.62;
        lookY = 2.18;
        follow = 6.5;
        if (this.focus) { lookX = this.focus.x + T.lookBias * biasT; lookZ = this.focus.z * T.depthShift; }
        break;

      case 'FINISHER': {
        // The one place the camera is allowed to move for its own sake.
        this.orbit += dt / 1000;
        wantYaw = T.yaw + 0.7 + this.orbit * 0.5;
        wantDist = clamp(5.3 + spreadX * 0.15, 5.0, 6.5);
        wantHeight = lerp(3.3, 2.5, clamp(this.modeTimer / 1500, 0, 1));
        lookY = 2.12;
        follow = 4.2;
        if (this.focus) { lookX = this.focus.x + T.lookBias * biasT; lookZ = this.focus.z * T.depthShift; }
        break;
      }

      case 'NEARFALL':
        // Snap in tight on the kickout. Short and violent.
        wantDist = 4.6;
        wantHeight = 2.15;
        lookY = 1.72;
        follow = 9;
        if (this.focus) { lookX = this.focus.x + T.lookBias * biasT; lookZ = this.focus.z * T.depthShift; }
        break;

      case 'PIN':
        wantDist = 5.0;
        wantHeight = 2.45;
        lookY = 1.78;
        follow = 5.0;
        if (this.focus) { lookX = this.focus.x + T.lookBias * biasT; lookZ = this.focus.z * T.depthShift; }
        break;

      case 'VICTORY': {
        this.orbit += dt / 1000;
        const f = this.focus;
        if (f) { lookX = f.x + T.lookBias * biasT; lookZ = f.z * T.depthShift; }
        wantYaw = T.yaw + this.orbit * 0.3;
        wantDist = 5.9;
        wantHeight = 2.95;
        lookY = 2.28;
        follow = 2.6;
        break;
      }
    }

    this.punchAmount = damp(this.punchAmount, 0, T.punchDecay, dt);
    this.shake = damp(this.shake, 0, T.punchDecay * 1.4, dt);

    this.yaw = damp(this.yaw, wantYaw, follow, dt);
    this.dist = damp(this.dist, wantDist - this.punchAmount * 0.55, follow, dt);
    this.height = damp(this.height, wantHeight, follow, dt);

    this.look.x = damp(this.look.x, lookX, follow, dt);
    this.look.y = damp(this.look.y, lookY, follow, dt);
    this.look.z = damp(this.look.z, lookZ, follow, dt);

    const sx = this.shake * 0.13 * Math.sin(this.modeTimer / 11);
    const sy = this.shake * 0.11 * Math.sin(this.modeTimer / 7 + 1.3);

    this.pos.x = this.look.x + Math.sin(this.yaw) * this.dist + sx;
    this.pos.z = this.look.z - Math.cos(this.yaw) * this.dist;
    this.pos.y = this.height + sy;

    this.cam.position.copyFrom(this.pos);
    this.cam.setTarget(this.look);
  }
}
