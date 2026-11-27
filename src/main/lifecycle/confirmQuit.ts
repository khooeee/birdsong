import type { BrowserWindow } from "electron";
import { quitWarningDetail } from "./quitWarningDetail";
import { windowDialog } from "../dialogs/windowDialog";

/** Ask before quitting over running chats; resolves true to go ahead. */
export async function confirmQuit(
  win: BrowserWindow | null,
  runningChats: number,
): Promise<boolean> {
  const detail = quitWarningDetail(runningChats);
  if (!detail) return true;
  const options: Electron.MessageBoxOptions = {
    type: "warning",
    buttons: ["Quit", "Cancel"],
    defaultId: 0,
    cancelId: 1,
    message: "Quit Birdsong?",
    detail,
  };
  const { response } = await windowDialog.message(win, options);
  return response === 0;
}
