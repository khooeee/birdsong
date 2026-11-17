import { dialog, type BrowserWindow } from "electron";
import { toEditorPath } from "./toEditorPath";

/** Native file picker, returning an absolute editor path. */
export async function pickSessionFile(win: BrowserWindow | null, cwd: string): Promise<string | null> {
  const options: Electron.OpenDialogOptions = {
    title: "Open File",
    properties: ["openFile"],
    ...(cwd ? { defaultPath: cwd } : {}),
  };
  const result = win && !win.isDestroyed()
    ? await dialog.showOpenDialog(win, options)
    : await dialog.showOpenDialog(options);
  const file = result.filePaths[0];
  if (result.canceled || !file) return null;
  return toEditorPath(cwd, file);
}
