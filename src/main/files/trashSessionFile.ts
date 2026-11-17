import { dialog, shell, type BrowserWindow } from "electron";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { resolveInsideCwd } from "./resolveInsideCwd";

/**
 * Ask, then move a file or folder under the session cwd to the Trash. `unsaved` warns that open
 * edits go with it. False when the user cancels.
 */
export async function trashSessionFile(
  win: BrowserWindow | null,
  cwd: string,
  relPath: string,
  unsaved: boolean,
): Promise<boolean> {
  const target = resolveInsideCwd(cwd, relPath);
  if (target === path.resolve(cwd)) throw new Error("The project folder itself cannot be deleted.");
  const isFolder = (await fs.lstat(target)).isDirectory();
  const options: Electron.MessageBoxOptions = {
    type: "warning",
    buttons: ["Move to Trash", "Cancel"],
    defaultId: 0,
    cancelId: 1,
    message: `Are you sure you want to delete ${path.basename(target)}${isFolder ? " and its contents" : ""}?`,
    detail: `${unsaved ? "Your unsaved changes will be lost. " : ""}You can restore it from the Trash.`,
  };
  const { response } = win && !win.isDestroyed()
    ? await dialog.showMessageBox(win, options)
    : await dialog.showMessageBox(options);
  if (response !== 0) return false;
  await shell.trashItem(target);
  return true;
}
