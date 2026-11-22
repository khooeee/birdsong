import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { imageViewer } from "./imageViewerStore";
import { transcriptImageUrl } from "./transcriptImageUrl";
import { ZOOM_STEPS, fitScale, nextZoom, openScale, pinchScale } from "./zoomScale";
import "./images.css";

type ZoomMode = "auto" | "fit" | "fixed";

interface Anchor {
  relX: number;
  relY: number;
  cursorX: number;
  cursorY: number;
}

/** Full-pane viewer for one stored transcript image. Scrolls both ways; zoom steps or fits. */
export function ImageViewer({ name }: { name: string }) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const scaleRef = useRef(1);
  const modeRef = useRef<ZoomMode>("auto");
  const naturalRef = useRef<{ width: number; height: number } | null>(null);
  const anchorRef = useRef<Anchor | null>(null);
  const panRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    scrollLeft: number;
    scrollTop: number;
    panX: number;
    panY: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [mode, setMode] = useState<ZoomMode>("auto");
  const [ready, setReady] = useState(false);
  const [missing, setMissing] = useState(false);

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

  const zoomBy = useCallback((direction: 1 | -1, clientX: number, clientY: number) => {
    zoomTo(nextZoom(scaleRef.current, direction), clientX, clientY);
  }, [zoomTo]);

  const zoomFromCenter = useCallback((direction: 1 | -1) => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    zoomBy(direction, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }, [zoomBy]);

  const actualSize = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    zoomTo(1, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }, [zoomTo]);

  const fit = useCallback(() => {
    modeRef.current = "fit";
    setMode("fit");
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
  }, [zoomTo]);

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
  }, [actualSize, zoomFromCenter]);

  const onPointerDown = (event: PointerEvent<HTMLImageElement>) => {
    if (event.button !== 0) return;
    const stage = stageRef.current;
    if (!stage) return;
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: stage.scrollLeft,
      scrollTop: stage.scrollTop,
      panX: panRef.current.x,
      panY: panRef.current.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLImageElement>) => {
    const drag = dragRef.current;
    const stage = stageRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !stage) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    stage.scrollLeft = drag.scrollLeft - dx;
    stage.scrollTop = drag.scrollTop - dy;
    // Scroll absorbs the drag while the image overflows. The rest shifts it across the plate.
    const panX = drag.panX + dx - (drag.scrollLeft - stage.scrollLeft);
    const panY = drag.panY + dy - (drag.scrollTop - stage.scrollTop);
    panRef.current = { x: panX, y: panY };
    event.currentTarget.style.translate = `${panX}px ${panY}px`;
  };

  const endDrag = (event: PointerEvent<HTMLImageElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
  };

  const onContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    if (event.target !== imgRef.current) return;
    void window.birdsong.showImageContextMenu(name);
  };

  const atMin = scale <= ZOOM_STEPS[0] + 1e-6;
  const atMax = scale >= ZOOM_STEPS[ZOOM_STEPS.length - 1] - 1e-6;
  const percent = `${Math.round(scale * 100)}%`;

  return (
    <div ref={viewerRef} className="image-viewer" role="dialog" aria-modal="true" aria-label="Image" onContextMenu={onContextMenu}>
      <div ref={stageRef} className="image-viewer-stage">
        {missing ? (
          <div className="image-viewer-missing">Image unavailable</div>
        ) : (
          <div className="image-viewer-frame">
            <img
              ref={imgRef}
              src={transcriptImageUrl(name)}
              alt=""
              draggable={false}
              className={!ready ? "pending" : dragging ? "dragging" : undefined}
              style={natural ? {
                width: natural.width * scale,
                height: natural.height * scale,
                translate: `${panRef.current.x}px ${panRef.current.y}px`,
              } : undefined}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onLoad={(event) => {
                const image = event.currentTarget;
                const size = { width: image.naturalWidth, height: image.naturalHeight };
                naturalRef.current = size;
                setNatural(size);
              }}
              onError={() => setMissing(true)}
            />
          </div>
        )}
      </div>
      <div className="image-viewer-bar">
        <button type="button" className="btn" aria-label="Zoom out" data-tooltip="Zoom out (−)" disabled={!ready || atMin} onClick={() => zoomFromCenter(-1)}>−</button>
        <button type="button" className="btn" aria-label="Actual size" data-tooltip="Actual size (0)" disabled={!ready} onClick={actualSize}>{ready ? percent : "…"}</button>
        <button type="button" className="btn" aria-label="Zoom in" data-tooltip="Zoom in (+)" disabled={!ready || atMax} onClick={() => zoomFromCenter(1)}>+</button>
        <button type="button" className="btn" aria-label="Fit to screen" data-tooltip="Fit" disabled={!ready} onClick={fit}>Fit</button>
        <button type="button" className="btn" aria-label="Close" data-tooltip="Close (Escape)" onClick={() => imageViewer.close()}>✕</button>
      </div>
    </div>
  );
}
