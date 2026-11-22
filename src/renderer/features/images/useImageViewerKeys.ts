import { useEffect, type RefObject } from "react";
import { imageViewer } from "./imageViewerStore";
import type { ImageSize } from "./useImageZoom";

/** Escape closes. +/− zoom from the center. 0 is actual size. */
export function useImageViewerKeys(
  naturalRef: RefObject<ImageSize | null>,
  zoomFromCenter: (direction: 1 | -1) => void,
  actualSize: () => void,
): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        imageViewer.close();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey || !naturalRef.current) return;
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        event.stopPropagation();
        zoomFromCenter(1);
      } else if (event.key === "-") {
        event.preventDefault();
        event.stopPropagation();
        zoomFromCenter(-1);
      } else if (event.key === "0") {
        event.preventDefault();
        event.stopPropagation();
        actualSize();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [actualSize, naturalRef, zoomFromCenter]);
}
