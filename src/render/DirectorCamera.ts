import type { Scene } from '@babylonjs/core/scene';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TUNING } from '@/game/config/tuning';
import { clamp, damp, lerp } from '@/game/util/math';

export type CamMode = 'PLAY' | 'PIN' | 'SIGNATURE' | 'FINISHER' | 'VICTORY' | 'ENTRANCE';

export interface CamTarget { x: number; y: number; z: number }

/**
 * The camera is part of the entertainment (Bible s12), but it must never lose
 * the fighters, induce nausea, or make touch input unpredictable — so every
 * move is damped, the yaw only ever drifts, and the player never controls it.
 */
export class DirectorCamera {
  readonly cam: UniversalCamera;
  mode: CamMode = 'PLAY';

  private yaw = TUNING.camera.baseYaw;
  private yawTarget = TUNING.camera.baseYaw;
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
    this.cam.fov = 0.86;
    // No manual camera control anywhere in the game.
    this.cam.inputs.clear();
    scene.activeCamera = this.cam;
  }

  setReduceShake(v: boolean): void { this.reduceShake = v; }

  /**
   * Current yaw. The touch stick is camera-relative — pushing up means "away
   * from me", not "toward world +Z" — so the app needs this to rotate input.
   */
  get yawNow(): number { return this.yaw; }

  /** A hit impulse: a fast micro push-in plus shake, decaying quickly. */
  punch(amount: number): void {
    this.punchAmount = Math.min(1.6, this.punchAmount + amount);
    if (!this.reduceShake) this.shake = Math.min(1, this.shake + amount * 0.6);
  }

  /** Switches framing for a big moment. `focus` frames a single fighter. */
  setMode(mode: CamMode, focus?: CamTarget): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.modeTimer = 0;
    this.focus = focus ?? null;
    // A signature or finisher swings to the other side of the ring for impact.
    if (mode === 'SIGNATURE') this.yawTarget = TUNING.camera.baseYaw - 0.55;
    else if (mode === 'FINISHER') this.yawTarget = TUNING.camera.baseYaw + 0.85;
    else if (mode === 'PIN') this.yawTarget = TUNING.camera.baseYaw - 0.3;
    else this.yawTarget = TUNING.camera.baseYaw;
  }

  setFocus(focus: CamTarget | null): void { this.focus = focus; }

  update(dt: number, a: CamTarget, b: CamTarget): void {
    this.modeTimer += dt;
    const T = TUNING.camera;

    const midX = (a.x + b.x) * 0.5;
    const midZ = (a.z + b.z) * 0.5;
    const spread = Math.hypot(a.x - b.x, a.z - b.z);

    let wantDist = clamp(T.minDist + spread * 0.55, T.minDist, T.maxDist);
    let wantHeight = T.height;
    let lookY = T.lookHeight;
    let lookX = midX;
    let lookZ = midZ;
    let follow = T.follow;

    switch (this.mode) {
      case 'ENTRANCE':
        wantDist = 7.6;
        wantHeight = 3.4;
        this.yawTarget = T.baseYaw + Math.sin(this.modeTimer / 1400) * 0.35;
        follow = 1.6;
        break;
      case 'SIGNATURE':
        wantDist = clamp(T.minDist - 0.4 + spread * 0.3, 4.6, 6.4);
        wantHeight = 2.5;
        lookY = 1.7;
        follow = 6.5;
        break;
      case 'FINISHER': {
        // Slow orbit, tight on the pair, for 2-4 seconds of spectacle.
        this.orbit += dt / 1000;
        wantDist = clamp(5.0 + spread * 0.2, 4.4, 6.2);
        wantHeight = lerp(3.4, 2.1, clamp(this.modeTimer / 1400, 0, 1));
        lookY = 1.7;
        this.yawTarget = T.baseYaw + 0.85 + this.orbit * 0.42;
        follow = 4.2;
        break;
      }
      case 'PIN':
        // Low, mat level: the count should feel like it is happening to you.
        // Above the ropes looking down, or the cover happens behind them.
        wantDist = 4.4;
        wantHeight = 2.95;
        lookY = 1.25;
        follow = 5.0;
        if (this.focus) { lookX = this.focus.x; lookZ = this.focus.z; }
        break;
      case 'VICTORY': {
        this.orbit += dt / 1000;
        const f = this.focus;
        if (f) { lookX = f.x; lookZ = f.z; }
        wantDist = 5.4;
        wantHeight = 2.9;
        lookY = 1.8;
        this.yawTarget = T.baseYaw + this.orbit * 0.28;
        follow = 2.6;
        break;
      }
      default:
        // Subtle drift keeps the posts from parking in front of the action.
        this.yawTarget = T.baseYaw + Math.sin(this.modeTimer / 5200) * 0.2
          + clamp(midX * 0.06, -0.22, 0.22);
    }

    this.punchAmount = damp(this.punchAmount, 0, T.punchDecay, dt);
    this.shake = damp(this.shake, 0, T.punchDecay * 1.4, dt);

    this.yaw = damp(this.yaw, this.yawTarget, follow, dt);
    this.dist = damp(this.dist, wantDist - this.punchAmount * 0.7, follow, dt);
    this.height = damp(this.height, wantHeight, follow, dt);

    this.look.x = damp(this.look.x, lookX, follow, dt);
    this.look.y = damp(this.look.y, lookY, follow, dt);
    this.look.z = damp(this.look.z, lookZ, follow, dt);

    const sx = this.shake * 0.14 * Math.sin(this.modeTimer / 11);
    const sy = this.shake * 0.12 * Math.sin(this.modeTimer / 7 + 1.3);

    this.pos.x = this.look.x + Math.sin(this.yaw) * this.dist + sx;
    this.pos.z = this.look.z - Math.cos(this.yaw) * this.dist;
    this.pos.y = this.height + sy;

    /*
     * Keep the camera outside the ring. Following the midpoint at close range
     * could otherwise walk it in past a corner post, which then filled the shot
     * and hid the fight behind it.
     */
    const radial = Math.hypot(this.pos.x, this.pos.z);
    if (radial < T.minRadius && radial > 0.001) {
      const k = T.minRadius / radial;
      this.pos.x *= k;
      this.pos.z *= k;
    }

    this.cam.position.copyFrom(this.pos);
    this.cam.setTarget(this.look);
  }
}
