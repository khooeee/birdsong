import { useEffect, useMemo, useState } from "react";
import type { ActiveTabId } from "../../../shared/activeTabId";
import type { Session } from "../../../shared/session";
import { railModeStore } from "../explorer/railModeStore";
import { flatRailSessions } from "./flatRailSessions";
import { shareSession } from "./shareSession";
import { shareById } from "./shareById";
import { useSessionTranscripts } from "./useSessionTranscripts";

/** IPC-backed session list and transcripts. */
export function useAppSessionState() {
  const [pinnedSessions, setPinnedSessions] = useState<Session[]>([]);
  const [unpinnedSessions, setUnpinnedSessions] = useState<Session[]>([]);
  const [activeTabId, setActiveTabId] = useState<ActiveTabId>(null);
  const [focusEvent, setFocusEvent] = useState<{
    id: string;
    turnId: string;
    sessionId: string;
    key: number;
  } | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  useEffect(() => {
    void window.birdsong.listSessions().then((data) => {
      railModeStore.setHasSessions(data.pinned.length + data.unpinned.length > 0);
      setPinnedSessions(data.pinned);
      setUnpinnedSessions(data.unpinned);
      setActiveTabId(data.activeTabId);
    });

    const unsubs = [
      window.birdsong.onSessionsChanged(({ pinned: p, unpinned: u, activeTabId: a }) => {
        railModeStore.setHasSessions(p.length + u.length > 0);
        setPinnedSessions((prev) => shareById(prev, p, shareSession));
        setUnpinnedSessions((prev) => shareById(prev, u, shareSession));
        setActiveTabId(a);
        // A focus belongs to one session. Clear it on leaving so a later visit does not force
        // that session's right rail (which each tab keeps) back onto the old event.
        setFocusEvent((prev) => (prev && prev.sessionId !== a ? null : prev));
      }),
      window.birdsong.onSessionRemoved(({ message }) => setSessionNotice(message)),
      window.birdsong.onNavigateToEvent(({ sessionId, turnId, eventId }) => {
        setFocusEvent((prev) => ({
          id: eventId,
          turnId,
          sessionId,
          key: (prev?.key ?? 0) + 1,
        }));
      }),
    ];

    return () => {
      unsubs.forEach((u) => u());
    };
  }, []);

  const openSessions = useMemo(
    () => flatRailSessions(pinnedSessions, unpinnedSessions),
    [pinnedSessions, unpinnedSessions],
  );

  const activeSession = useMemo(
    () => openSessions.find((t) => t.id === activeTabId) ?? null,
    [openSessions, activeTabId],
  );

  const transcripts = useSessionTranscripts(activeSession?.id);

  return {
    pinnedSessions,
    unpinnedSessions,
    activeTabId,
    activeSession,
    transcripts,
    focusEvent,
    setFocusEvent,
    sessionNotice,
    setSessionNotice,
  };
}
