import { useEffect, useRef, useSyncExternalStore } from "react";
import type { ActiveTabId } from "../../../shared/activeTabId";
import { sessionUnreadStore } from "./sessionUnreadStore";

/** Session ids with an unread completed turn; cleared when that chat is active. */
export function useSessionUnreadDots(activeTabId: ActiveTabId) {
  const unread = useSyncExternalStore(sessionUnreadStore.subscribe, sessionUnreadStore.getSnapshot);
  const activeRef = useRef(activeTabId);
  activeRef.current = activeTabId;

  useEffect(() => {
    return window.birdsong.onPromptComplete(({ sessionId }) => {
      if (sessionId === activeRef.current) return;
      sessionUnreadStore.markUnread(sessionId);
    });
  }, []);

  useEffect(() => {
    if (activeTabId) sessionUnreadStore.markRead(activeTabId);
  }, [activeTabId]);

  return { unread, toggleUnread: sessionUnreadStore.toggle };
}
