import * as fs from "node:fs/promises";
import * as path from "node:path";
import { migrateExplorerPaths } from "./migrateExplorerPaths";
import { workingFolderRoot } from "./workingFolderRoot";
import { BrowserWindow, ipcMain } from "electron";
import { showFileContextMenu } from "../contextMenus/showFileContextMenu";
import type { SessionManager } from "../sessions/SessionManager";
import { parsePersistedExplorer } from "../storage/parsePersistedExplorer";
import { loadSessionExplorer, saveSessionExplorer } from "../storage/sessionExplorer";
import { confirmUnsavedChanges } from "./confirmUnsavedChanges";
import { listSessionDir } from "./listSessionDir";
import { listSessionFiles } from "./listSessionFiles";
import { pickSaveFile } from "./pickSaveFile";
import { pickSessionFile } from "./pickSessionFile";
import { readSessionFile } from "./readSessionFile";
import { registerFindInFilesIpc } from "./registerFindInFilesIpc";
import { renameSessionFile } from "./renameSessionFile";
import { SessionFileWatcher } from "./SessionFileWatcher";
import { trashSessionFile } from "./trashSessionFile";
import { writeSessionFile } from "./writeSessionFile";
import { listGitDiff } from "../git/listGitDiff";
import { getGithubRepoUrl } from "../git/getGithubRepoUrl";
import { readGitPatch } from "../git/readGitPatch";
import type { GitDiffScope } from "../../shared/gitDiff";

/** File explorer and editor channels. Returns the watcher to dispose on quit. */
export function registerFileIpc(sessions: SessionManager): SessionFileWatcher {
  const watcher = new SessionFileWatcher();
  const sessionOf = (sessionId: string) => {
    const session = sessions.getSession(sessionId);
    if (!session) throw new Error("This agent session no longer exists.");
    return session;
  };

  const cwdOf = (sessionId: string) => sessionOf(sessionId).cwd;
  registerFindInFilesIpc(sessionOf);
  ipcMain.handle("git:githubRepo", (_e, id: string) => getGithubRepoUrl(cwdOf(id)));
  ipcMain.handle("git:diff", (_e, id: string, scope: GitDiffScope) =>
    listGitDiff(sessionOf(id).workingFolders, scope));
  ipcMain.handle("git:patch", (_e, id: string, root: string, file: string, oldPath: string | undefined,
    scope: GitDiffScope, fullContext: boolean) =>
    readGitPatch(sessionOf(id).workingFolders, root, file, oldPath, scope, fullContext));
  ipcMain.handle("folders:add", (_e, id: string, folder: string) => sessions.workingFolders.add(id, folder));
  ipcMain.handle("folders:remove", (_e, id: string, folderId: string) => sessions.workingFolders.remove(id, folderId));
  ipcMain.handle("folders:move", (_e, id: string, folderId: string, beforeId?: string) =>
    sessions.workingFolders.move(id, folderId, beforeId));
  ipcMain.handle("files:resolve", async (_e, id: string, file: string) => {
    const cwd = cwdOf(id);
    const root = await fs.realpath(cwd).catch(() => path.resolve(cwd));
    return path.resolve(root, file).split(path.sep).join("/");
  });

  ipcMain.handle("files:list", (_e, sessionId: string, relPath: string) =>
    listSessionDir(workingFolderRoot(sessionOf(sessionId), relPath), relPath),
  );
  ipcMain.handle("files:listAll", async (_e, sessionId: string) => {
    const results = await Promise.allSettled(sessionOf(sessionId).workingFolders.map(async (folder) =>
      (await listSessionFiles(folder.path)).map((file) => path.join(folder.path, file).split(path.sep).join("/")),
    ));
    return [...new Set(results.flatMap((result) => result.status === "fulfilled" ? result.value : []))];
  });
  ipcMain.handle("files:pick", (event, sessionId: string) =>
    pickSessionFile(BrowserWindow.fromWebContents(event.sender), cwdOf(sessionId)),
  );
  ipcMain.handle("files:read", (_e, sessionId: string, relPath: string) =>
    readSessionFile(cwdOf(sessionId), relPath),
  );
  ipcMain.handle(
    "files:write",
    (_e, sessionId: string, relPath: string, text: string, baseMtimeMs: number | null) =>
      writeSessionFile(cwdOf(sessionId), relPath, text, baseMtimeMs),
  );
  ipcMain.handle("files:contextMenu", (event, sessionId: string, relPath: string) => {
    const session = sessionOf(sessionId);
    return showFileContextMenu(BrowserWindow.fromWebContents(event.sender),
      workingFolderRoot(session, relPath), path.resolve(session.cwd, relPath));
  });
  ipcMain.handle("files:rename", (_e, sessionId: string, relPath: string, name: string) =>
    renameSessionFile(workingFolderRoot(sessionOf(sessionId), relPath, true), relPath, name),
  );
  ipcMain.handle("files:trash", (event, sessionId: string, relPath: string, unsaved: boolean) =>
    trashSessionFile(BrowserWindow.fromWebContents(event.sender),
      workingFolderRoot(sessionOf(sessionId), relPath, true), relPath, unsaved),
  );
  ipcMain.handle("files:pickSave", (event, sessionId: string, suggested: string) =>
    pickSaveFile(BrowserWindow.fromWebContents(event.sender), cwdOf(sessionId), suggested),
  );
  ipcMain.handle("files:confirmUnsaved", (event, names: string[]) =>
    confirmUnsavedChanges(BrowserWindow.fromWebContents(event.sender), names),
  );
  ipcMain.handle("files:watch", (event, sessionId: string) => {
    watcher.watch(sessionId, sessionOf(sessionId).workingFolders, event.sender);
  });
  ipcMain.handle("files:unwatch", (_e, sessionId: string) => {
    watcher.unwatch(sessionId);
  });
  sessions.subscribe((channel, payload) => {
    if (channel !== "sessions:changed") return;
    const { pinned, unpinned } = payload as import("../../shared/birdsongApi").SessionListPayload;
    for (const session of [...pinned, ...unpinned]) watcher.refresh(session.id, session.workingFolders);
  });
  // Session ids name folders on disk; only ids of known sessions get through.
  ipcMain.handle("files:getExplorer", async (_e, sessionId: string) => {
    const cwd = cwdOf(sessionId);
    const saved = await loadSessionExplorer(sessionId);
    return saved ? migrateExplorerPaths(saved, cwd) : null;
  });
  ipcMain.handle("files:saveExplorer", async (_e, sessionId: string, state: unknown) => {
    cwdOf(sessionId);
    const parsed = parsePersistedExplorer(state);
    if (parsed) await saveSessionExplorer(sessionId, parsed);
  });
  return watcher;
}
