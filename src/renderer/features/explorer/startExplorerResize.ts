import type { PointerEvent as ReactPointerEvent } from "react";
import { startColumnDrag } from "../layout/startColumnDrag";
import { explorerWidth } from "./explorerWidth";

/** Drag the file explorer's right edge to resize it; persists the width on release. */
export function startExplorerResize(event: ReactPointerEvent): void {
  const startWidth = explorerWidth.read();
  startColumnDrag(event, (dx, done) => explorerWidth.apply(startWidth + dx, done));
}
