import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { fitScale, nextZoom, openScale } from "./zoomScale";

type ZoomMode = "auto" | "fit" | "fixed";

interface Anchor {
  relX: number;
  relY: number;
  cursorX: number;
  cursorY: number;
}

export type ImageSize = { width: number; height: number };

function centerOf(stage: HTMLElement): { x: number; y: number } {
  const rect = stage.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/** Scale, fit, and the point a zoom should stay pinned under. */
export function useImageZoom() {
  const viewerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const scaleRef = useRef(1);
  const modeRef = useRef<ZoomMode>("auto");
  const naturalRef = useRef<ImageSize | null>(null);
  const anchorRef = useRef<Anchor | null>(null);
  const panRef = useRef({ x: 0, y: 0 });
  const [natural, setNatural] = useState<ImageSize | null>(null);
  const [scale, setScale] = useState(1);
  const [mode, setMode] = useState<ZoomMode>("auto");
  const [ready, setReady] = useState(false);

  const rememberAnchor = useCallback((clientX: number, clientY: number) => {
    const stage = stageRef.current;
    const img = imgRef.current;
    if (!stage || !img || img.getBoundingClientRect().width <= 0) return;
    const imgRect = img.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    anchorRef.current = {
      relX: (clientX - imgRect.left) / imgRect.width,
      relY: (clientY - imgRect.top) / imgRect.height,
      cursorX: clientX - stageRect.left,
      cursorY: clientY - stageRect.top,
    };
  }, []);

  const zoomTo = useCallback((next: number, clientX: number, clientY: number) => {
    if (modeRef.current === "fixed" && next === scaleRef.current) return;
    rememberAnchor(clientX, clientY);
    scaleRef.current = next;
    modeRef.current = "fixed";
    setMode("fixed");
    setScale(next);
  }, [rememberAnchor]);

  const zoomFromCenter = useCallback((direction: 1 | -1) => {
    const stage = stageRef.current;
    if (!stage) return;
    const center = centerOf(stage);
    zoomTo(nextZoom(scaleRef.current, direction), center.x, center.y);
  }, [zoomTo]);

  const actualSize = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const center = centerOf(stage);
    zoomTo(1, center.x, center.y);
  }, [zoomTo]);

  const fit = useCallback(() => {
    modeRef.current = "fit";
    setMode("fit");
  }, []);

  const onLoad = useCallback((image: HTMLImageElement) => {
    const size = { width: image.naturalWidth, height: image.naturalHeight };
    naturalRef.current = size;
    setNatural(size);
  }, []);

  useLayoutEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !natural || mode === "fixed") {
      if (natural) setReady(true);
      return;
    }
    const apply = () => {
      // Fit and the open scale are centered; a drag offset would leave the image off to the side.
      panRef.current = { x: 0, y: 0 };
      if (imgRef.current) imgRef.current.style.translate = "";
      // Measure the pane, not the scroller, so a scrollbar cannot shrink the fit.
      const fitToPane = fitScale(viewer.clientWidth, viewer.clientHeight, natural.width, natural.height);
      const next = mode === "auto" ? openScale(fitToPane) : fitToPane;
      if (next !== scaleRef.current) {
        scaleRef.current = next;
        setScale(next);
      }
      setReady(true);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(viewer);
    return () => observer.disconnect();
  }, [natural, mode]);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const stage = stageRef.current;
    const img = imgRef.current;
    if (!anchor || !stage || !img) return;
    anchorRef.current = null;
    const imgRect = img.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    stage.scrollLeft += imgRect.left + anchor.relX * imgRect.width - (stageRect.left + anchor.cursorX);
    stage.scrollTop += imgRect.top + anchor.relY * imgRect.height - (stageRect.top + anchor.cursorY);
  }, [scale, mode]);

  return {
    viewerRef,
    stageRef,
    imgRef,
    scaleRef,
    naturalRef,
    panRef,
    natural,
    scale,
    ready,
    zoomTo,
    zoomFromCenter,
    actualSize,
    fit,
    onLoad,
  };
}
