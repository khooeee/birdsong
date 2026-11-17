import { useCallback, useState } from "react";
import { ipcErrorMessage } from "../../../shared/ipcErrorMessage";

/** UI list edits use main-process mutations, just like MCP callers. */
export function useWorkingFolderActions(sessionId: string, cwd: string) {
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const add = useCallback(async () => {
    setAdding(true);
    setError(null);
    try {
      const path = await window.birdsong.pickFolder(cwd);
      if (path) await window.birdsong.addWorkingFolder(sessionId, path);
    } catch (err) {
      setError(ipcErrorMessage(err));
    } finally {
      setAdding(false);
    }
  }, [sessionId, cwd]);
  const remove = useCallback(async (folderId: string) => {
    setError(null);
    try {
      await window.birdsong.removeWorkingFolder(sessionId, folderId);
    } catch (err) {
      setError(ipcErrorMessage(err));
    }
  }, [sessionId]);
  const move = useCallback(async (folderId: string, beforeId?: string) => {
    setError(null);
    try {
      await window.birdsong.moveWorkingFolder(sessionId, folderId, beforeId);
    } catch (err) {
      setError(ipcErrorMessage(err));
    }
  }, [sessionId]);
  return { add, remove, move, adding, error };
}
