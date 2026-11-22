import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { imageViewer } from "./imageViewerStore";
import { transcriptImageUrl } from "./transcriptImageUrl";
import { ZOOM_STEPS, fitScale, nextZoom, openScale } from "./zoomScale";
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
    let accumulated = 0;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      if (!naturalRef.current) return;
      let delta = event.deltaY;
      if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) delta *= 16;
      if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) delta *= viewer.clientHeight;
      accumulated += delta;
      if (Math.abs(accumulated) < 40) return;
      const direction: 1 | -1 = accumulated > 0 ? -1 : 1;
      accumulated = 0;
      zoomBy(direction, event.clientX, event.clientY);
    };
    viewer.addEventListener("wheel", onWheel, { passive: false });
    return () => viewer.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

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

  const onStageClick = (event: MouseEvent<HTMLDivElement>) => {
    // The image stays open. A click on the stage itself is the scrollbar.
    if (event.target === imgRef.current || event.target === stageRef.current) return;
    imageViewer.close();
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
      <div ref={stageRef} className="image-viewer-stage" onClick={onStageClick}>
        {missing ? (
          <div className="image-viewer-missing">Image unavailable</div>
        ) : (
          <div className="image-viewer-frame">
            <img
              ref={imgRef}
              src={transcriptImageUrl(name)}
              alt=""
              draggable={false}
              className={ready ? undefined : "pending"}
              style={natural ? { width: natural.width * scale, height: natural.height * scale } : undefined}
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
