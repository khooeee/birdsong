import { dialog, type BrowserWindow } from "electron";
import * as fs from "node:fs/promises";
import { isMissingFolder } from "./isMissingFolder";

/** Offer to create `cwd` when it does not exist; false when the user declines. */
export async function confirmCreateFolder(win: BrowserWindow | null, cwd: string): Promise<boolean> {
  if (!(await isMissingFolder(cwd))) return true;
  const options: Electron.MessageBoxOptions = {
    type: "question",
    buttons: ["Create Folder", "Cancel"],
    defaultId: 0,
    cancelId: 1,
    message: "This folder doesn't exist. Do you want to create it?",
    detail: cwd,
  };
  const { response } = win && !win.isDestroyed()
    ? await dialog.showMessageBox(win, options)
    : await dialog.showMessageBox(options);
  if (response !== 0) return false;
  await fs.mkdir(cwd, { recursive: true });
  return true;
}
