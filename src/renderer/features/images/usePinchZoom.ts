import { useEffect, type RefObject } from "react";
import type { ImageSize } from "./useImageZoom";
import { pinchScale } from "./zoomScale";

/** Trackpad pinch (ctrl/meta + wheel) zooms toward the cursor. */
export function usePinchZoom(
  viewerRef: RefObject<HTMLDivElement | null>,
  naturalRef: RefObject<ImageSize | null>,
  scaleRef: RefObject<number>,
  zoomTo: (next: number, clientX: number, clientY: number) => void,
): void {
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    let pending: { scale: number; x: number; y: number } | null = null;
    let frame = 0;
    const onWheel = (event: WheelEvent) => {
      // Trackpad pinch sets ctrlKey. Fingers apart is a negative delta; together is positive.
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      if (!naturalRef.current) return;
      let delta = event.deltaY;
      if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) delta *= 16;
      if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) delta *= viewer.clientHeight;
      const current = pending?.scale ?? scaleRef.current;
      pending = { scale: pinchScale(current, delta), x: event.clientX, y: event.clientY };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const gesture = pending;
        pending = null;
        if (!gesture) return;
        zoomTo(gesture.scale, gesture.x, gesture.y);
      });
    };
    viewer.addEventListener("wheel", onWheel, { capture: true, passive: false });
    return () => {
      viewer.removeEventListener("wheel", onWheel, { capture: true });
      if (frame) cancelAnimationFrame(frame);
    };
  }, [viewerRef, naturalRef, scaleRef, zoomTo]);
}
