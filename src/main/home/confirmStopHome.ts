import type { BrowserWindow } from "electron";
import { windowDialog } from "../dialogs/windowDialog";

/** Ask before replacing a Home chat mid-turn; true to go ahead and stop it. */
export async function confirmStopHome(win: BrowserWindow | null, action: string): Promise<boolean> {
  const options: Electron.MessageBoxOptions = {
    type: "warning",
    buttons: [action, "Cancel"],
    defaultId: 1,
    cancelId: 1,
    message: "Home is working.",
    detail: "This stops its turn and starts a new Home chat. Find in History still has the old one.",
  };
  const { response } = await windowDialog.message(win, options);
  return response === 0;
}
