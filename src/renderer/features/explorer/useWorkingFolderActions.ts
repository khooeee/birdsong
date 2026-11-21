import { useCallback, useState } from "react";
import { ipcErrorMessage } from "../../../shared/ipcErrorMessage";
import type { WorkingFolder } from "../../../shared/workingFolder";
import { dirListingStore } from "./dirListingStore";
import { parentPath } from "./parentPath";

/** UI list edits use main-process mutations, just like MCP callers. */
export function useWorkingFolderActions(sessionId: string, cwd: string) {
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const pick = useCallback(async (startPath: string, current?: WorkingFolder) => {
    setPicking(true);
    setError(null);
    try {
      const path = await window.birdsong.pickFolder(startPath);
      if (!path) return;
      if (!current) {
        await window.birdsong.addWorkingFolder(sessionId, path);
      } else {
        const folders = await window.birdsong.replaceWorkingFolder(sessionId, current.id, path);
        if (folders.some((folder) => folder.id === current.id && folder.path === current.path)) {
          dirListingStore.refresh(sessionId, current.path);
        }
      }
    } catch (err) {
      setError(ipcErrorMessage(err));
    } finally {
      setPicking(false);
    }
  }, [sessionId]);
  const add = useCallback(() => pick(cwd), [pick, cwd]);
  const locate = useCallback((id: string, path: string) => pick(parentPath(path), { id, path }), [pick]);
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
  return { add, locate, remove, move, picking, error };
}
