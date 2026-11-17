import type { BrowserWindow } from "electron";

/**
 * A menu item that sends `event` to the renderer as a menu command (see useMenuCommands).
 * The renderer's key handlers own the shortcut; the accelerator is shown, not registered (macOS always registers it).
 */
export function commandMenuItem(
  win: () => BrowserWindow | null,
  label: string,
  accelerator: string | undefined,
  event: string,
): Electron.MenuItemConstructorOptions {
  return {
    label,
    accelerator,
    registerAccelerator: false,
    click: () => {
      win()?.webContents.send("menu:command", event);
    },
  };
}
