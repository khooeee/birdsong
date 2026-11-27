import type { BrowserWindow } from "electron";
import { windowDialog } from "../dialogs/windowDialog";

/** Native picker for the APNs auth key file. */
export async function pickApnsKey(win: BrowserWindow | null): Promise<string | null> {
  const options: Electron.OpenDialogOptions = {
    title: "APNs Auth Key",
    properties: ["openFile"],
    filters: [{ name: "APNs Auth Key", extensions: ["p8"] }],
  };
  const result = await windowDialog.open(win, options);
  return result.canceled ? null : result.filePaths[0] ?? null;
}
