import { useRef, useState, type PointerEvent, type RefObject } from "react";

function onScrollbar(stage: HTMLElement, event: PointerEvent<HTMLElement>): boolean {
  const rect = stage.getBoundingClientRect();
  const barX = stage.offsetHeight - stage.clientHeight;
  const barY = stage.offsetWidth - stage.clientWidth;
  return event.clientY >= rect.bottom - barX || event.clientX >= rect.right - barY;
}

/** Drag scrolls the workspace. The scrollbars move with the pointer. */
export function useImagePan(stageRef: RefObject<HTMLDivElement | null>) {
  const dragRef = useRef<{ pointerId: number; x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const stage = stageRef.current;
    if (!stage || onScrollbar(stage, event)) return;
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: stage.scrollLeft,
      scrollTop: stage.scrollTop,
    };
    stage.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const stage = stageRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !stage) return;
    stage.scrollLeft = drag.scrollLeft - (event.clientX - drag.x);
    stage.scrollTop = drag.scrollTop - (event.clientY - drag.y);
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
  };

  return { dragging, onPointerDown, onPointerMove, endDrag };
}
