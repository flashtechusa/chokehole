export interface Insets { top: number; right: number; bottom: number; left: number; }

let probe: HTMLDivElement | null = null;

/**
 * Reads env(safe-area-inset-*) in CSS pixels. iOS reports the home indicator and
 * the notch here; controls must clear both.
 */
export function readSafeArea(): Insets {
  if (typeof document === 'undefined') return { top: 0, right: 0, bottom: 0, left: 0 };
  if (!probe) {
    probe = document.createElement('div');
    probe.style.cssText = [
      'position:fixed', 'visibility:hidden', 'pointer-events:none',
      'top:0', 'left:0', 'width:0', 'height:0',
      'padding-top:env(safe-area-inset-top,0px)',
      'padding-right:env(safe-area-inset-right,0px)',
      'padding-bottom:env(safe-area-inset-bottom,0px)',
      'padding-left:env(safe-area-inset-left,0px)',
    ].join(';');
    document.body.appendChild(probe);
  }
  const cs = getComputedStyle(probe);
  return {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
}
