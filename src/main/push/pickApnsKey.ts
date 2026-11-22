import { dialog, type BrowserWindow } from "electron";

/** Native picker for the APNs auth key file. */
export async function pickApnsKey(win: BrowserWindow | null): Promise<string | null> {
  const options: Electron.OpenDialogOptions = {
    title: "APNs Auth Key",
    properties: ["openFile"],
    filters: [{ name: "APNs Auth Key", extensions: ["p8"] }],
  };
  const result = win && !win.isDestroyed() ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
  return result.canceled ? null : result.filePaths[0] ?? null;
}
