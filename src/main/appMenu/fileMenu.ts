import type { BrowserWindow } from "electron";
import { commandMenuItem } from "./commandMenuItem";

/** File menu: the File Explorer mode commands and their shortcuts. Disabled in Sessions mode. */
export function fileMenu(win: () => BrowserWindow | null): Electron.MenuItemConstructorOptions {
  const item = (label: string, accelerator: string | undefined, event: string) =>
    commandMenuItem(win, label, accelerator, event);
  return {
    id: "file-menu",
    label: "File",
    submenu: [
      item("New File", "CmdOrCtrl+N", "birdsong:new-file"),
      item("Open File…", "CmdOrCtrl+O", "birdsong:open-file"),
      item("Go to File…", "CmdOrCtrl+P", "birdsong:go-to-file"),
      item("Find in Files…", "CmdOrCtrl+Shift+F", "birdsong:find-in-files"),
      { type: "separator" },
      item("Save", "CmdOrCtrl+S", "birdsong:save-file"),
      item("Save As…", undefined, "birdsong:save-file-as"),
      { type: "separator" },
      item("Next File", "Ctrl+Tab", "birdsong:next-file"),
      item("Previous File", "Ctrl+Shift+Tab", "birdsong:prev-file"),
      { type: "separator" },
      item("Close File", "CmdOrCtrl+W", "birdsong:close-file"),
    ],
  };
}
