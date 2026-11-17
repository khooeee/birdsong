import type { WorkingFolder } from "../../../shared/workingFolder";
import { useEffect } from "react";
import { refreshSessionFiles } from "./refreshSessionFiles";

/** While the session's explorer is shown: catch up on changes made meanwhile, then follow live ones. */
export function useSessionFileWatch(sessionId: string, folders: readonly WorkingFolder[]): void {
  const rootsKey = folders.map((folder) => `${folder.id}:${folder.path}`).sort().join("\0");
  useEffect(() => {
    refreshSessionFiles(sessionId, null);
    void window.birdsong.watchSessionFiles(sessionId);
    const stop = window.birdsong.onSessionFilesChanged(({ sessionId: changed, paths }) => {
      if (changed === sessionId) refreshSessionFiles(sessionId, paths);
    });
    return () => {
      stop();
      void window.birdsong.unwatchSessionFiles(sessionId);
    };
  }, [sessionId, rootsKey]);
}
