import type { BrowserWindow } from "electron";
import { windowDialog } from "../dialogs/windowDialog";

/** Native picker for the Firebase service account key. */
export async function pickFcmKey(win: BrowserWindow | null): Promise<string | null> {
  const options: Electron.OpenDialogOptions = {
    title: "Firebase Service Account Key",
    properties: ["openFile"],
    filters: [{ name: "Service Account Key", extensions: ["json"] }],
  };
  const result = await windowDialog.open(win, options);
  return result.canceled ? null : result.filePaths[0] ?? null;
}
