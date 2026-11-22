import { BrowserWindow, Menu } from "electron";
import { copyImageFile } from "../images/copyImageFile";
import { saveImageFile } from "../images/saveImageFile";

/** Native Copy / Save… menu for a transcript image. */
export function showImageContextMenu(win: BrowserWindow | null, name: string): void {
  if (!win || win.isDestroyed()) return;
  Menu.buildFromTemplate([
    { label: "Copy", click: () => void copyImageFile(name).catch(console.error) },
    { label: "Save…", click: () => void saveImageFile(win, name).catch(console.error) },
  ]).popup({ window: win });
}
