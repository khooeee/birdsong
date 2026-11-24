import { useState, type MouseEvent } from "react";
import { ImageViewerBar } from "./ImageViewerBar";
import { imageViewer } from "./imageViewerStore";
import { transcriptImageUrl } from "./transcriptImageUrl";
import { useImagePan } from "./useImagePan";
import { useImageViewerKeys } from "./useImageViewerKeys";
import { useImageZoom } from "./useImageZoom";
import { usePinchZoom } from "./usePinchZoom";
import "./images.css";

/** Full-pane viewer for one stored transcript image. Scrolls both ways; zoom steps or fits. */
export function ImageViewer({ name }: { name: string }) {
  const zoom = useImageZoom();
  const pan = useImagePan(zoom.stageRef);
  usePinchZoom(zoom.viewerRef, zoom.naturalRef, zoom.scaleRef, zoom.zoomTo);
  useImageViewerKeys(zoom.naturalRef, zoom.zoomFromCenter, zoom.actualSize);
  const [missing, setMissing] = useState(false);
  const names = imageViewer.getNames();
  const index = names.indexOf(name);

  const onContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    if (event.target !== zoom.imgRef.current) return;
    void window.birdsong.showImageContextMenu(name);
  };

  return (
    <div ref={zoom.viewerRef} className="image-viewer" role="dialog" aria-modal="true" aria-label={names.length > 1 ? `Image ${index + 1} of ${names.length}` : "Image"} onContextMenu={onContextMenu}>
      <div
        ref={zoom.stageRef}
        className={pan.dragging ? "image-viewer-stage dragging" : "image-viewer-stage"}
        onPointerDown={pan.onPointerDown}
        onPointerMove={pan.onPointerMove}
        onPointerUp={pan.endDrag}
        onPointerCancel={pan.endDrag}
      >
        {missing ? (
          <div className="image-viewer-missing">Image unavailable</div>
        ) : (
          <div className="image-viewer-frame">
            <img
              ref={zoom.imgRef}
              src={transcriptImageUrl(name)}
              alt=""
              draggable={false}
              className={!zoom.ready ? "pending" : undefined}
              style={zoom.natural ? {
                width: zoom.natural.width * zoom.scale,
                height: zoom.natural.height * zoom.scale,
              } : undefined}
              onLoad={(event) => zoom.onLoad(event.currentTarget)}
              onError={() => setMissing(true)}
            />
          </div>
        )}
      </div>
      <ImageViewerBar
        ready={zoom.ready}
        scale={zoom.scale}
        index={index}
        total={names.length}
        onPrev={imageViewer.prev}
        onNext={imageViewer.next}
        onZoomOut={() => zoom.zoomFromCenter(-1)}
        onActualSize={zoom.actualSize}
        onZoomIn={() => zoom.zoomFromCenter(1)}
        onFit={zoom.fit}
      />
    </div>
  );
}
