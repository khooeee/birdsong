/** Discrete zoom steps for the image viewer. Fit can land between these. */
export const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4] as const;

const STEP_EPSILON = 1e-6;

/** Largest scale that shows the whole image in the pane. */
export function fitScale(viewportW: number, viewportH: number, imageW: number, imageH: number): number {
  if (viewportW <= 0 || viewportH <= 0 || imageW <= 0 || imageH <= 0) return 1;
  return Math.min(viewportW / imageW, viewportH / imageH);
}

/** Open scale: actual pixels, or fit when the image is larger than the pane. */
export function openScale(fit: number): number {
  return Math.min(1, fit);
}

/** Next larger or smaller step. Stays put at either end. */
export function nextZoom(scale: number, direction: 1 | -1): number {
  if (direction > 0) {
    return ZOOM_STEPS.find((step) => step > scale + STEP_EPSILON) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1];
  }
  for (let index = ZOOM_STEPS.length - 1; index >= 0; index--) {
    if (ZOOM_STEPS[index] < scale - STEP_EPSILON) return ZOOM_STEPS[index];
  }
  return ZOOM_STEPS[0];
}
