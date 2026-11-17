import * as path from "node:path";
import { BrowserWindow, clipboard, Menu } from "electron";
import type { FileMenuAction } from "../../shared/fileMenuAction";

/**
 * Native menu for a file tree row. Resolves with a Rename / Delete pick, or null otherwise;
 * Copy Path / Copy Relative Path (to working folder `root`) are handled here.
 */
export function showFileContextMenu(
  win: BrowserWindow | null,
  root: string,
  file: string,
): Promise<FileMenuAction | null> {
  if (!win || win.isDestroyed()) return Promise.resolve(null);
  const target = path.resolve(file);
  return new Promise((resolve) => {
    // Electron runs a picked item's click before the close callback, so a pick is never resolved as null.
    Menu.buildFromTemplate([
      { label: "Rename…", click: () => resolve("rename") },
      { label: "Delete", click: () => resolve("delete") },
      { type: "separator" },
      { label: "Copy Path", click: () => clipboard.writeText(target) },
      { label: "Copy Relative Path", click: () => clipboard.writeText(path.relative(root, target)) },
    ]).popup({ window: win, callback: () => resolve(null) });
  });
}
