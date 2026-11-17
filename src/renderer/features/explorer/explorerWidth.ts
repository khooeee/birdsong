import { getAppSettingsCache, patchAppSettings } from "../settings/appSettingsCache";
import { fitSidePaneWidth } from "../layout/fitSidePaneWidth";
import { readCssPx } from "../layout/readCssPx";

/** Narrowest the explorer can be dragged. */
const MIN_WIDTH = 160;
const DEFAULT_WIDTH = 240;

function clampWidth(width: number): number {
  return fitSidePaneWidth(width, readCssPx("--rail"), window.innerWidth, MIN_WIDTH);
}

function read(): number {
  const value = getAppSettingsCache().explorerWidth;
  return Number.isFinite(value) ? clampWidth(value) : DEFAULT_WIDTH;
}

/** Apply width to `--explorer`. Pass `persist` on drag end to save it. */
function apply(width: number, persist = false): number {
  const next = clampWidth(width);
  document.documentElement.style.setProperty("--explorer", `${next}px`);
  if (persist) void patchAppSettings({ explorerWidth: next });
  return next;
}

/** Width of the file explorer column in Files mode. */
export const explorerWidth = { read, apply };
