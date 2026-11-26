import type { BrowserWindow } from "electron";
import { commandMenuItem } from "./commandMenuItem";
import { SESSION_MENU_IDS } from "./sessionMenuIds";

/**
 * Session menu: the session commands and their shortcuts. Each item's id is its event;
 * File Explorer mode keeps only FILES_MODE_SESSION_COMMANDS enabled.
 */
export function sessionMenu(win: () => BrowserWindow | null): Electron.MenuItemConstructorOptions {
  const item = (label: string, accelerator: string | undefined, event: string) =>
    ({ ...commandMenuItem(win, label, accelerator, event), id: event });
  const isMac = process.platform === "darwin";
  return {
    id: SESSION_MENU_IDS.sessionMenu,
    label: "Session",
    submenu: [
      item("New Session…", "CmdOrCtrl+N", "birdsong:new-session"),
      item("Go to Home", "CmdOrCtrl+1", "birdsong:open-home"),
      item("Home Files", "CmdOrCtrl+2", "birdsong:home-files"),
      item("Fork", "CmdOrCtrl+Shift+N", "birdsong:fork-session"),
      item("Rename…", "CmdOrCtrl+R", "birdsong:rename-session"),
      item("Pin / Unpin", isMac ? "Ctrl+Cmd+P" : "Ctrl+Alt+P", "birdsong:toggle-pin"),
      item("Mark as Unread / Read", undefined, "birdsong:mark-unread"),
      { type: "separator" },
      item("Focus Prompt", "CmdOrCtrl+I", "birdsong:focus-prompt"),
      item("Filter Sessions", "CmdOrCtrl+P", "birdsong:focus-filter"),
      { type: "separator" },
      item("Next Session", "Ctrl+Tab", "birdsong:next-session"),
      item("Previous Session", "Ctrl+Shift+Tab", "birdsong:prev-session"),
      // macOS registers menu accelerators app-wide, which would take Cmd+Left / Cmd+Right from text
      // fields. The renderer owns those keys and leaves them alone while a text field has focus.
      item("Back", isMac ? undefined : "Alt+Left", "birdsong:session-back"),
      item("Forward", isMac ? undefined : "Alt+Right", "birdsong:session-forward"),
      { type: "separator" },
      item("Close Session", "CmdOrCtrl+W", "birdsong:close-session"),
    ],
  };
}
