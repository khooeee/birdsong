import { randomUUID } from "node:crypto";
import type { Session } from "../../shared/session";
import type { WorkingFolder } from "../../shared/workingFolder";
import { canonicalFolderPath } from "./canonicalFolderPath";

interface Host {
  getSession(id: string): Session | undefined;
  ensure(id: string): Promise<Session | null>;
  save(session: Session): Promise<void>;
  emit(): void;
}

/** Serialize list edits per session, including path resolution and persistence. */
export class SessionWorkingFolders {
  private pending = new Map<string, Promise<unknown>>();

  constructor(private readonly host: Host) {}

  list(sessionId: string): WorkingFolder[] {
    const session = this.host.getSession(sessionId);
    if (!session) throw new Error("Session not found");
    return session.workingFolders;
  }

  add(sessionId: string, folderPath: string): Promise<WorkingFolder[]> {
    return this.change(sessionId, async (session) => {
      const path = await canonicalFolderPath(folderPath, session.cwd);
      if (session.workingFolders.some((folder) => folder.path === path)) return session.workingFolders;
      return [...session.workingFolders, { id: randomUUID(), path }];
    });
  }

  remove(sessionId: string, folderId: string): Promise<WorkingFolder[]> {
    return this.change(sessionId, (session) => {
      const next = session.workingFolders.filter((folder) => folder.id !== folderId);
      return next.length === session.workingFolders.length ? session.workingFolders : next;
    });
  }

  /** UI only: move before another root, or to the end. Resolve against the current list. */
  move(sessionId: string, folderId: string, beforeId?: string): Promise<WorkingFolder[]> {
    return this.change(sessionId, (session) => {
      const folders = session.workingFolders;
      const folder = folders.find((item) => item.id === folderId);
      if (!folder) throw new Error("Working folder not found");
      if (beforeId === folderId) return folders;
      const next = folders.filter((item) => item.id !== folderId);
      const at = beforeId === undefined ? next.length : next.findIndex((item) => item.id === beforeId);
      if (at < 0) throw new Error("Target working folder not found");
      next.splice(at, 0, folder);
      return next.every((item, i) => item === folders[i]) ? folders : next;
    });
  }

  private change(
    sessionId: string,
    update: (session: Session) => WorkingFolder[] | Promise<WorkingFolder[]>,
  ): Promise<WorkingFolder[]> {
    const operation = (this.pending.get(sessionId) ?? Promise.resolve()).catch(() => undefined).then(async () => {
      const session = await this.host.ensure(sessionId);
      if (!session) throw new Error("Session not found");
      const next = await update(session);
      if (this.host.getSession(sessionId) !== session) throw new Error("Session no longer exists");
      if (next !== session.workingFolders) {
        const previous = session.workingFolders;
        session.workingFolders = next;
        try {
          await this.host.save(session);
        } catch (error) {
          session.workingFolders = previous;
          throw error;
        }
        this.host.emit();
      }
      return session.workingFolders;
    });
    this.pending.set(sessionId, operation);
    void operation.finally(() => {
      if (this.pending.get(sessionId) === operation) this.pending.delete(sessionId);
    }).catch(() => undefined);
    return operation;
  }
}
