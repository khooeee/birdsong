import { useRef, useState, type PointerEvent, type RefObject } from "react";

type Pan = { x: number; y: number };

/** Drag the image: the scroller takes overflow, and the rest pans it across the plate. */
export function useImagePan(stageRef: RefObject<HTMLDivElement | null>, panRef: RefObject<Pan>) {
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

  return { dragging, onPointerDown, onPointerMove, endDrag };
}
