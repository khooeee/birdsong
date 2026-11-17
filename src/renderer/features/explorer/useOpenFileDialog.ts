import { useEffect } from "react";
import { explorerPersistence } from "./explorerPersistence";
import { explorerStore } from "./explorerStore";

let picking = false;

/** Open a chosen file in a permanent tab; cancellation leaves the current tabs alone. */
export function useOpenFileDialog(sessionId: string): void {
  useEffect(() => {
    const onOpenFile = async () => {
      if (picking) return;
      picking = true;
      try {
        const picked = await window.birdsong.pickSessionFile(sessionId);
        if (picked === null) return;
        const path = await window.birdsong.resolveSessionPath(sessionId, picked);
        await explorerPersistence.ensureRestored(sessionId);
        explorerStore.revealFile(sessionId, path);
      } catch (error) {
        console.error("[editor] open file failed:", error);
      } finally {
        picking = false;
      }
    };
    window.addEventListener("birdsong:open-file", onOpenFile);
    return () => window.removeEventListener("birdsong:open-file", onOpenFile);
  }, [sessionId]);
}
