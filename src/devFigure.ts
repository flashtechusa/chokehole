/** Scratch harness: poses the flat wrestlers with the real clip library. */
import { buildClips, STYLE_BRUTE, STYLE_POISED } from '@/anim/clips';
import { clearPose, sampleClip, type Pose } from '@/anim/Pose';
import { buildSkeleton2D, emptySolution, solve2D } from '@/render2d/Skeleton2D';
import { drawFigure } from '@/render2d/Figure';
import { dotPattern } from '@/render2d/Paint';
import { JASSY_2D, RAID_2D, type Figure2D } from '@/render2d/art';

const canvas = document.getElementById('c') as HTMLCanvasElement;
const g = canvas.getContext('2d')!;
const S = 150;                       // pixels per world unit
const INK = 3.4 / S;                 // a constant 3.4px line

const q = new URLSearchParams(location.search);
const clipName = q.get('clip') ?? 'idle';
const t = Number(q.get('t') ?? 0.35);

const dots = dotPattern(g, '#120A18', 5, 1.1);

function draw(fig: Figure2D, style: typeof STYLE_POISED, x: number, facing: number): void {
  const bones = buildSkeleton2D(fig.proportions);
  const clips = buildClips(style);
  const clip = clips[clipName] ?? clips.idle!;
  const pose = sampleClip(clip, t * clip.duration, clearPose({} as Pose));
  const bias: Pose = { spine: [0, 0, fig.proportions.hunch] };
  const sol = solve2D(bones, pose, bias, emptySolution());

  g.save();
  g.translate(x, 340);
  g.scale(facing * S, -S);
  drawFigure(g, fig, sol, INK, dots);
  g.restore();
}

function frame(): void {
  g.fillStyle = '#F2E4CE';
  g.fillRect(0, 0, canvas.width, canvas.height);
  draw(JASSY_2D, STYLE_POISED, 300, 1);
  draw(RAID_2D, STYLE_BRUTE, 560, -1);
}
frame();
(window as unknown as { __READY: boolean }).__READY = true;
