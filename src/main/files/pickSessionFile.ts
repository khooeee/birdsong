import type { BrowserWindow } from "electron";
import { toEditorPath } from "./toEditorPath";
import { windowDialog } from "../dialogs/windowDialog";

/** Native file picker, returning an absolute editor path. */
export async function pickSessionFile(win: BrowserWindow | null, cwd: string): Promise<string | null> {
  const options: Electron.OpenDialogOptions = {
    title: "Open File",
    properties: ["openFile"],
    ...(cwd ? { defaultPath: cwd } : {}),
  };
  const result = await windowDialog.open(win, options);
  const file = result.filePaths[0];
  if (result.canceled || !file) return null;
  return toEditorPath(cwd, file);
}
