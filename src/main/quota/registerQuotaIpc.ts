import { ipcMain, type BrowserWindow } from "electron";
import type { QuotaTracker } from "./QuotaTracker";

/** The rail footer reads quotas once, then gets each new list. */
export function registerQuotaIpc(quota: QuotaTracker, getWindow: () => BrowserWindow | null): void {
  ipcMain.handle("quota:list", () => quota.list());
  quota.subscribe((quotas) => getWindow()?.webContents.send("quota:changed", quotas));
}
