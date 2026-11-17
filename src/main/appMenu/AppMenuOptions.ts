import type { BrowserWindow } from "electron";
import type { RailMode } from "../../shared/railMode";

/** Getters the application menu reads from the main process. */
export type AppMenuOptions = {
  getMainWindow: () => BrowserWindow | null;
  getRailMode: () => RailMode;
  getHasSessions: () => boolean;
  getEditorWordWrap: () => boolean;
};
