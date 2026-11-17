import { app, ipcMain, type BrowserWindow } from "electron";
import path from "node:path";
import { sessionIdFromLink } from "../../shared/sessionIdFromLink";
import type { SessionManager } from "../sessions/SessionManager";
import { revealWindow } from "./revealWindow";

/** Queue OS links until React subscribes, then open sessions in arrival order. */
export function installSessionLinks(
  sessions: Pick<SessionManager, "navigateToSession">,
  getWindow: () => BrowserWindow | null,
): void {
  let ready = false;
  let opening = false;
  const pending: string[] = [];

  const drain = async () => {
    if (!ready || opening) return;
    opening = true;
    try {
      while (ready && pending.length) {
        const sessionId = pending.shift()!;
        const win = getWindow();
        if (win) revealWindow(win);
        try {
          await sessions.navigateToSession(sessionId);
        } catch (error) {
          console.error("Could not open session link:", error);
          if (win && !win.isDestroyed()) {
            win.webContents.send("session:removed", { message: "Could not open that session link." });
          }
        }
      }
    } finally {
      opening = false;
    }
  };

  const open = (link: string) => {
    const sessionId = sessionIdFromLink(link);
    if (!sessionId) return;
    pending.push(sessionId);
    void drain();
  };

  app.on("open-url", (event, url) => {
    if (!sessionIdFromLink(url)) return;
    event.preventDefault();
    open(url);
  });
  app.on("second-instance", (_event, argv) => argv.forEach(open));
  process.argv.forEach(open);

  app.on("browser-window-created", (_event, win) => {
    win.webContents.on("did-start-loading", () => { ready = false; });
    win.on("closed", () => { ready = false; });
  });
  ipcMain.handle("sessions:openLink", (_event, link: string) => open(link));
  ipcMain.handle("sessions:linksReady", () => {
    ready = true;
    void drain();
  });

  const register = () => {
    if (process.defaultApp) {
      if (process.argv[1]) {
        app.setAsDefaultProtocolClient("birdsong", process.execPath, [path.resolve(process.argv[1])]);
      }
    } else {
      app.setAsDefaultProtocolClient("birdsong");
    }
  };
  app.on("ready", register);
}
