import { useCallback } from "react";
import { closeSessionSafely } from "../editor/closeSessionSafely";
import { forkSession } from "./forkSession";

/** Stable SessionRail IPC callbacks (avoid inline lambdas if the rail is memoized later). */
export function useSessionRailActions() {
  const onCloseSession = useCallback((id: string) => {
    void closeSessionSafely(id);
  }, []);
  const onStop = useCallback((id: string) => {
    void window.birdsong.cancelPrompt(id).catch(console.error);
  }, []);
  const onRenameSession = useCallback((id: string, title: string) => {
    void window.birdsong.renameSession(id, title);
  }, []);
  const onPin = useCallback((id: string) => {
    void window.birdsong.pinSession(id);
  }, []);
  const onUnpin = useCallback((id: string) => {
    void window.birdsong.unpinSession(id);
  }, []);

  return {
    onCloseSession,
    onStop,
    onRenameSession,
    onFork: forkSession,
    onPin,
    onUnpin,
  };
}
