import { ipcMain, type WebContents } from "electron";
import type { Session } from "../../shared/session";
import { findInFiles } from "./findInFiles";

/** Each window has at most one disk search running. New queries cancel the previous scan. */
export function registerFindInFilesIpc(sessionOf: (id: string) => Session): void {
  const searches = new WeakMap<WebContents, AbortController>();
  ipcMain.handle("files:search", async (event, id: string, query: string, matchCase: boolean) => {
    searches.get(event.sender)?.abort();
    const controller = new AbortController();
    searches.set(event.sender, controller);
    try {
      return await findInFiles(sessionOf(id).workingFolders, query, matchCase, controller.signal);
    } finally {
      if (searches.get(event.sender) === controller) searches.delete(event.sender);
    }
  });
  ipcMain.handle("files:stopSearch", (event) => {
    searches.get(event.sender)?.abort();
    searches.delete(event.sender);
  });
}
