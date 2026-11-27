import { dialog, type BrowserWindow } from "electron";

type Parent = BrowserWindow | null | undefined;

function live(win: Parent): BrowserWindow | null {
  return win && !win.isDestroyed() ? win : null;
}

/** Native dialogs attached to `win` while it is alive; free-standing once it is closed or missing. */
export const windowDialog = {
  message(win: Parent, options: Electron.MessageBoxOptions): Promise<Electron.MessageBoxReturnValue> {
    const parent = live(win);
    return parent ? dialog.showMessageBox(parent, options) : dialog.showMessageBox(options);
  },

  open(win: Parent, options: Electron.OpenDialogOptions): Promise<Electron.OpenDialogReturnValue> {
    const parent = live(win);
    return parent ? dialog.showOpenDialog(parent, options) : dialog.showOpenDialog(options);
  },

  save(win: Parent, options: Electron.SaveDialogOptions): Promise<Electron.SaveDialogReturnValue> {
    const parent = live(win);
    return parent ? dialog.showSaveDialog(parent, options) : dialog.showSaveDialog(options);
  },
};
