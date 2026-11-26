import { BrowserWindow, ipcMain } from "electron";
import type { AgentKind } from "../../shared/agentKind";
import type { SessionManager } from "../sessions/SessionManager";
import { checkHomeChange } from "./checkHomeChange";
import { confirmStopHome } from "./confirmStopHome";

/** Renderer → main channels for the Home session. */
export function registerHomeIpc(sessions: SessionManager): void {
  ipcMain.handle("home:open", () => sessions.home.open());
  ipcMain.handle("home:startFresh", async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (sessions.home.current()?.status === "running" && !(await confirmStopHome(win, "Start Fresh"))) return;
    await sessions.home.startFresh();
  });
  ipcMain.handle("home:checkChange", (event, cwd: string, agent: AgentKind) =>
    checkHomeChange(BrowserWindow.fromWebContents(event.sender), sessions.home.current(), cwd, agent),
  );
}
