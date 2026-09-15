import './ui/ui.css';
import './ui/actionArcade.css';
import { App } from './app/App';
import { registerSW } from './app/pwa';

/**
 * Entry point. Boots the 2.5D match stage into #stage and the HTML UI into #ui.
 * Everything visible above the match is DOM, at real device pixels.
 */
const canvas = document.getElementById('stage') as HTMLCanvasElement | null;
const ui = document.getElementById('ui');

if (!canvas || !ui) {
  throw new Error('CHOKE HOLE: missing #stage or #ui');
}

// Safari fires gestures at the document; keep them off the game surface.
for (const ev of ['gesturestart', 'gesturechange', 'gestureend'] as const) {
  document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
}
document.addEventListener('touchmove', (e) => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

const app = new App(canvas, ui);

// Test hook for the smoke test and the headless pacing harness.
(window as unknown as { __CHOKEHOLE__: unknown }).__CHOKEHOLE__ = app;

registerSW();
