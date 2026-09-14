import type { Scene } from '@babylonjs/core/scene';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TUNING } from '@/game/config/tuning';
import { RING } from '@/game/combat/ring';
import { clamp, damp, lerp } from '@/game/util/math';

export type CamMode =
  | 'PLAY' | 'PIN' | 'SIGNATURE' | 'FINISHER' | 'VICTORY' | 'ENTRANCE' | 'NEARFALL';

export interface CamTarget { x: number; y: number; z: number }

/**
 * How far back the camera physically stands. With an orthographic projection
 * this changes nothing about the picture's scale, so it is chosen purely to put
 * the whole arena — crowd included — behind the lens.
 */
const CAMERA_STANDOFF = 12.5;

/**
 * A FIXED, ORTHOGRAPHIC, dead side-on wrestling camera.
 *
 * Orthographic is the whole point. A perspective lens gives the ring vanishing
 * points: the ropes converge toward the edges of the screen and the mat opens
 * out below the fighters as a receding trapezoid. However far back you put that
 * camera and however square you aim it, the picture reads as a three-dimensional
 * box you are looking into. With no perspective divide at all, parallel lines
 * stay parallel: the ropes are horizontal, the mat is a flat band, the posts are
 * vertical, and the arena reads as a painted stage with 3D actors on it. That is
 * what 2.5D looks like.
 *
 * `dist` is kept, and still drives every zoom rule, but it now sets the
 * orthographic half-height rather than pushing the camera away from the subject.
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
  private readonly scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
    this.cam = new UniversalCamera('director', new Vector3(0, 3, -8), scene);
    this.cam.mode = Camera.ORTHOGRAPHIC_CAMERA;
    /*
     * The camera stands well back and the orthographic box does the framing.
     * Distance no longer changes how big anything is, so it is free to be large
     * enough that nothing in the arena crosses the near plane.
     */
    this.cam.minZ = 0.1;
    this.cam.maxZ = 120;
    this.cam.fov = TUNING.camera.fov;
    // No manual camera control anywhere in the game.
    this.cam.inputs.clear();
    scene.activeCamera = this.cam;
  }

  /**
   * Sizes the orthographic box. `dist` is the same number every zoom rule
   * already produces, read as "how much world fits on screen" instead of "how
   * far away the camera stands".
   */
  private applyOrtho(): void {
    const halfH = this.dist * Math.tan(TUNING.camera.fov * 0.5);
    const aspect = this.scene.getEngine().getAspectRatio(this.cam) || 2.16;
    this.cam.orthoTop = halfH;
    this.cam.orthoBottom = -halfH;
    this.cam.orthoLeft = -halfH * aspect;
    this.cam.orthoRight = halfH * aspect;
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
        wantDist = 6.2;
        wantPitch = 0.62;
        wantYaw = T.yaw - 0.10 + Math.sin(this.modeTimer / 1500) * 0.07;
        follow = 1.8;
        break;

      case 'SIGNATURE':
        // A push in, not a swing. The whole point of the fixed side-on view is
        // that it never stops being the fixed side-on view; drama comes from the
        // zoom, the slow motion and the lighting, not from moving the camera off
        // its axis and making the player relearn left and right.
        wantYaw = T.yaw + 0.14;
        wantDist = 5.2;
        wantPitch = 0.49;
        lookY = 2.46;
        follow = 6.5;
        if (this.focus) { lookX = this.focus.x + T.lookBias * biasT; }
        break;

      case 'FINISHER': {
        // The one place the camera moves for its own sake — and even here it
        // only leans, because an orthographic view spun off its axis stops
        // reading as a stage and starts reading as a 3D model on a turntable.
        this.orbit += dt / 1000;
        wantYaw = T.yaw + 0.10 + Math.sin(this.orbit * 1.6) * 0.12;
        wantDist = clamp(5.3 + spreadX * 0.15, 5.0, 6.5);
        wantPitch = lerp(0.72, 0.46, clamp(this.modeTimer / 1500, 0, 1));
        lookY = 2.42;
        follow = 4.2;
        if (this.focus) { lookX = this.focus.x + T.lookBias * biasT; }
        break;
      }

      case 'NEARFALL':
        // Snap in tight on the kickout. Short and violent.
        wantDist = 5.1;
        wantPitch = 0.42;
        lookY = 1.72;
        follow = 9;
        if (this.focus) { lookX = this.focus.x + T.lookBias * biasT; }
        break;

      case 'PIN':
        wantDist = 5.3;
        wantPitch = 0.52;
        lookY = 1.78;
        follow = 5.0;
        if (this.focus) { lookX = this.focus.x + T.lookBias * biasT; }
        break;

      case 'VICTORY': {
        this.orbit += dt / 1000;
        const f = this.focus;
        if (f) { lookX = f.x + T.lookBias * biasT; }
        wantYaw = T.yaw + Math.sin(this.orbit * 0.9) * 0.14;
        wantDist = 5.9;
        wantPitch = 0.53;
        lookY = 2.52;
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
     * The stand-off is fixed, not the zoom: an orthographic camera renders the
     * same picture from anywhere along its own axis, so it sits far enough back
     * that the crowd and the barricade never cross in front of the ring.
     */
    this.pos.x = this.look.x + Math.sin(this.yaw) * CAMERA_STANDOFF + sx;
    this.pos.z = this.look.z - Math.cos(this.yaw) * CAMERA_STANDOFF;
    // Height is derived from the angle, so the tilt does not drift when the
    // look point rises for a turnbuckle or drops for a body on the floor.
    this.pos.y = this.look.y + Math.tan(this.pitch) * CAMERA_STANDOFF + sy;
    this.applyOrtho();

    this.cam.position.copyFrom(this.pos);
    this.cam.setTarget(this.look);
  }
}
