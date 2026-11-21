import { watch, type FSWatcher } from "node:fs";
import * as path from "node:path";
import type { WebContents } from "electron";
import type { WorkingFolder } from "../../shared/workingFolder";
import { errorMessage } from "../../shared/errorMessage";

const DEBOUNCE_MS = 150;
const MAX_PATHS = 500;

interface Watch {
  sessionId: string;
  folder: WorkingFolder;
  watcher: FSWatcher;
  sender: WebContents;
  pending: Set<string>;
  overflow: boolean;
  timer: NodeJS.Timeout | null;
}

/** One recursive watch per visible session root. File identities are absolute across roots. */
export class SessionFileWatcher {
  private readonly watches = new Map<string, Watch>();
  private readonly senders = new Map<string, WebContents>();

  watch(sessionId: string, folders: WorkingFolder[], sender: WebContents): void {
    this.senders.set(sessionId, sender);
    this.refresh(sessionId, folders);
  }

  refresh(sessionId: string, folders: WorkingFolder[], restartFolderId?: string): void {
    const sender = this.senders.get(sessionId);
    if (!sender) return;
    for (const [key, entry] of this.watches) {
      if (entry.sessionId !== sessionId) continue;
      const current = folders.find((folder) => folder.id === entry.folder.id);
      if (current?.path !== entry.folder.path || entry.folder.id === restartFolderId) this.close(key);
    }
    for (const folder of folders) this.start(sessionId, folder, sender);
  }

  unwatch(sessionId: string): void {
    this.senders.delete(sessionId);
    for (const [key, entry] of this.watches) {
      if (entry.sessionId === sessionId) this.close(key);
    }
  }

  dispose(): void {
    for (const sessionId of [...this.senders.keys()]) this.unwatch(sessionId);
  }

  private start(sessionId: string, folder: WorkingFolder, sender: WebContents): void {
    const key = `${sessionId}\0${folder.id}`;
    if (this.watches.has(key)) return;
    let watcher: FSWatcher;
    try {
      watcher = watch(folder.path, { recursive: true }, (_event, filename) => {
        const entry = this.watches.get(key);
        if (!entry) return;
        if (filename) {
          const relative = String(filename).split(path.sep).join("/");
          if (relative === ".git" || relative.startsWith(".git/")) return;
          if (entry.pending.size < MAX_PATHS) entry.pending.add(path.join(folder.path, relative).split(path.sep).join("/"));
          else entry.overflow = true;
        } else entry.overflow = true;
        entry.timer ??= setTimeout(() => this.flush(key), DEBOUNCE_MS);
      });
    } catch (err) {
      console.warn(`[files] cannot watch ${folder.path}:`, errorMessage(err));
      return;
    }
    watcher.on("error", (err) => {
      console.warn(`[files] stopped watching ${folder.path}:`, errorMessage(err));
      this.close(key);
      if (!sender.isDestroyed()) sender.send("files:changed", { sessionId, folderId: folder.id, paths: null });
    });
    this.watches.set(key, { sessionId, folder, watcher, sender, pending: new Set(), overflow: false, timer: null });
  }

  private close(key: string): void {
    const entry = this.watches.get(key);
    if (!entry) return;
    this.watches.delete(key);
    if (entry.timer) clearTimeout(entry.timer);
    entry.watcher.close();
  }

  private flush(key: string): void {
    const entry = this.watches.get(key);
    if (!entry) return;
    const paths = entry.overflow ? null : [...entry.pending];
    entry.pending.clear();
    entry.overflow = false;
    entry.timer = null;
    if (entry.sender.isDestroyed()) {
      this.unwatch(entry.sessionId);
      return;
    }
    entry.sender.send("files:changed", { sessionId: entry.sessionId, folderId: entry.folder.id, paths });
  }
}
