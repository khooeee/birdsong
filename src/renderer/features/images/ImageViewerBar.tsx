import { imageViewer } from "./imageViewerStore";
import { ZOOM_STEPS } from "./zoomScale";

/** Zoom, fit, and close for the image viewer. */
export function ImageViewerBar({
  ready,
  scale,
  onZoomOut,
  onActualSize,
  onZoomIn,
  onFit,
}: {
  ready: boolean;
  scale: number;
  onZoomOut: () => void;
  onActualSize: () => void;
  onZoomIn: () => void;
  onFit: () => void;
}) {
  const atMin = scale <= ZOOM_STEPS[0] + 1e-6;
  const atMax = scale >= ZOOM_STEPS[ZOOM_STEPS.length - 1] - 1e-6;
  const percent = `${Math.round(scale * 100)}%`;
  return (
    <div className="image-viewer-bar">
      <button type="button" className="btn" aria-label="Zoom out" data-tooltip="Zoom out (−)" disabled={!ready || atMin} onClick={onZoomOut}>−</button>
      <button type="button" className="btn" aria-label="Actual size" data-tooltip="Actual size (0)" disabled={!ready} onClick={onActualSize}>{ready ? percent : "…"}</button>
      <button type="button" className="btn" aria-label="Zoom in" data-tooltip="Zoom in (+)" disabled={!ready || atMax} onClick={onZoomIn}>+</button>
      <button type="button" className="btn" aria-label="Fit to screen" data-tooltip="Fit" disabled={!ready} onClick={onFit}>Fit</button>
      <button type="button" className="btn" aria-label="Close" data-tooltip="Close (Escape)" onClick={imageViewer.close}>✕</button>
    </div>
  );
}
