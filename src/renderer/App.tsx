import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { CreateSessionInput } from "../shared/createSessionInput";
import type { TranscriptTurn } from "../shared/transcript";
import { SessionRail } from "./features/sessions/SessionRail";
import { SessionNotice } from "./features/sessions/SessionNotice";
import { useAppSessionState } from "./features/sessions/useAppSessionState";
import { ChatPanel } from "./features/chat/ChatPanel";
import { RightRail } from "./features/chat/RightRail";
import { useRightRail } from "./features/chat/useRightRail";
import { useTurnDetailsEvent } from "./features/chat/useTurnDetailsEvent";
import { useChatActions } from "./features/chat/useChatActions";
import { useSessionScrollPosition } from "./features/sessions/useSessionScrollPosition";
import { useAppShortcuts } from "./features/shortcuts/useAppShortcuts";
import { useMenuCommands } from "./features/shortcuts/useMenuCommands";
import { FindBar } from "./features/find/FindBar";
import { FindInHistoryModal } from "./features/find/FindInHistoryModal";
import { useFindUiState } from "./features/find/useFindUiState";
import { NewSessionModal } from "./features/sessions/NewSessionModal";
import { useSessionRailActions } from "./features/sessions/useSessionRailActions";
import { useAgentQuestions } from "./features/permissions/useAgentQuestions";
import { useCompletionSound } from "./features/sound/useCompletionSound";
import { useReminderChime } from "./features/sound/useReminderChime";
import { useVoiceConnection } from "./features/voice/useVoiceConnection";
import { VoiceLogPanel } from "./features/voiceLog/VoiceLogPanel";
import { voiceLogView } from "./features/voiceLog/voiceLogView";
import { voiceTurnDetails } from "./features/voiceLog/voiceTurnDetails";
import { VoiceTurnRail } from "./features/voiceLog/VoiceTurnRail";
import { SubagentOpenContext } from "./features/subagents/SubagentOpenContext";
import { useSubagentTranscripts } from "./features/subagents/useSubagentTranscripts";
import { FilesView } from "./features/explorer/FilesView";
import { useRailMode } from "./features/explorer/useRailMode";
import { railModeStore } from "./features/explorer/railModeStore";
import { useFileShortcuts } from "./features/explorer/useFileShortcuts";
import { useRailModeShortcuts } from "./features/explorer/useRailModeShortcuts";
import { useQuitGuard } from "./features/editor/useQuitGuard";
import { CommandPalette } from "./features/commandPalette/CommandPalette";
import { DiffView } from "./features/diff/DiffView";

/** Stable fallback so memoized SessionTranscript does not re-render on a new `[]`. */
const NO_TURNS: TranscriptTurn[] = [];

export function App() {
  useCompletionSound();
  useReminderChime();
  useVoiceConnection();
  useFileShortcuts();
  useRailModeShortcuts();
  useMenuCommands();
  useQuitGuard();
  const {
    pinnedSessions,
    unpinnedSessions,
    activeTabId,
    activeSession,
    transcripts,
    focusEvent,
    setFocusEvent,
    sessionNotice,
    setSessionNotice,
  } = useAppSessionState();
  const railActions = useSessionRailActions();
  const voiceLogOpen = useSyncExternalStore(voiceLogView.subscribe, voiceLogView.getSnapshot);
  const voiceTurnId = useSyncExternalStore(voiceTurnDetails.subscribe, voiceTurnDetails.getSnapshot);
  const { subagentTranscripts, loadingSubagents, loadSubagentTranscript } = useSubagentTranscripts();
  const mode = useRailMode();
  const filesMode = mode === "files";
  const sessionsMode = mode === "sessions";

  useEffect(() => { voiceLogView.close(); }, [mode]);

  const [showNewSession, setShowNewSession] = useState(false);
  const [sessionFilter, setSessionFilter] = useState("");
  const {
    showFindInSessions,
    setShowFindInSessions,
    findOpen,
    findQuery,
    setFindQuery,
    findFocusKey,
    findFromTabSwitch,
    findScope,
    findScopeRef,
    closeFind,
    setFindVisible,
  } = useFindUiState(activeTabId);
  const chatRef = useRef<HTMLDivElement>(null);
  const rightRailScrollRef = useRef<HTMLDivElement>(null);
  const voiceLogRef = useRef<HTMLDivElement>(null);
  const voiceRailRef = useRef<HTMLDivElement>(null);
  const voiceRailOpen = voiceLogOpen && !!voiceTurnId;
  const askQuestion = useAgentQuestions(activeTabId);
  const pinTranscriptToBottom = useSessionScrollPosition(activeTabId, chatRef);

  const {
    rightRailView,
    closeRightRail,
    toggleRightRail,
    forceRightRail,
    toggleSubagentRightRail,
  } = useRightRail({
    activeSession,
    transcripts,
    subagentTranscripts,
    loadingSubagents,
  });

  const openSubagent = useCallback((sessionId: string, subagentId: string) => {
    loadSubagentTranscript(sessionId, subagentId);
    toggleSubagentRightRail(subagentId);
  }, [loadSubagentTranscript, toggleSubagentRightRail]);

  const findRootRefs = useMemo(() => {
    if (findScope) return [findScopeRef];
    if (voiceLogOpen) return [voiceRailOpen ? voiceRailRef : voiceLogRef];
    if (rightRailView) return [rightRailScrollRef];
    return [chatRef];
  }, [findScope, rightRailView, voiceLogOpen, voiceRailOpen]);
  const railOpen = voiceLogOpen ? voiceRailOpen : !!rightRailView;
  const findScopeName = findScope ? "message" : railOpen ? "turn-details" : voiceLogOpen ? "voice-log" : "session";

  useTurnDetailsEvent(toggleRightRail);

  // Each tab keeps its right rail open (or closed) across tab switches.
  const selectTab = useCallback((id: string) => {
    voiceLogView.close();
    void window.birdsong.setActiveTab(id);
    setFocusEvent(null);
  }, [setFocusEvent]);

  // Switching sessions any other way (shortcuts, new session, navigation) also leaves the Voice Log.
  useEffect(() => {
    voiceLogView.close();
  }, [activeTabId]);

  const promptFocus = useAppShortcuts({
    pinned: pinnedSessions,
    unpinned: unpinnedSessions,
    activeTabId,
    activeSession,
    selectTab,
    showNewSession,
    showFindInSessions,
    findOpen,
    rightRailOpen: !!rightRailView && sessionsMode,
    sessionFilter,
    setFindOpen: setFindVisible,
    setFindQuery,
    setShowNewSession,
    setShowFindInSessions,
    onCloseRightRail: closeRightRail,
  });

  const createSession = useCallback((input: CreateSessionInput) => {
    railModeStore.set("sessions");
    setShowNewSession(false);
    void window.birdsong.createSession(input);
    return Promise.resolve();
  }, []);

  const chat = useChatActions(activeTabId, askQuestion, pinTranscriptToBottom);

  return (
    <SubagentOpenContext.Provider value={openSubagent}>
      <div className="app">
        <SessionRail
          pinned={pinnedSessions}
          unpinned={unpinnedSessions}
          activeTabId={activeTabId}
          filter={sessionFilter}
          onFilter={setSessionFilter}
          onSelect={selectTab}
          onAdd={() => setShowNewSession(true)}
          {...railActions}
        />

        <div className="main relative">
          {sessionNotice && (
            <SessionNotice message={sessionNotice} onDismiss={() => setSessionNotice(null)} />
          )}

          {findOpen && (voiceLogOpen || (activeSession && sessionsMode)) && (
            <FindBar
              key={`${voiceLogOpen ? "voice-log" : activeTabId}:${findScope?.getAttribute("data-event-id") ?? findScopeName}`}
              query={findQuery}
              onQuery={setFindQuery}
              rootRefs={findRootRefs}
              rootsKey={`${railOpen ? 1 : 0}:${findScope?.getAttribute("data-event-id") ?? ""}`}
              scope={findScopeName}
              focusKey={findFocusKey}
              fromTabSwitch={findFromTabSwitch}
              onClose={closeFind}
            />
          )}

          {voiceLogOpen ? (
            <VoiceLogPanel scrollRef={voiceLogRef} />
          ) : (
            <>
              {/* Stays mounted under File Explorer mode so the transcript keeps its scroll position. */}
              <div className="main-view" hidden={!sessionsMode}>
                {activeSession ? (
                  <ChatPanel
                    session={activeSession}
                    turns={transcripts[activeSession.id] ?? NO_TURNS}
                    focusEventId={focusEvent?.id ?? null}
                    focusTurnId={focusEvent?.turnId ?? null}
                    focusEventKey={focusEvent?.key ?? 0}
                    promptFocus={promptFocus}
                    chatRef={chatRef}
                    onOpenRightRail={toggleRightRail}
                    onForceOpenRightRail={forceRightRail}
                    openSubagentId={rightRailView?.subagent?.id ?? null}
                    onSend={chat.send}
                    onInterrupt={chat.interrupt}
                    askQuestion={askQuestion}
                    onAsk={chat.answer}
                  />
                ) : (
                  <section className="panel">
                    <div className="empty">Select or create a session to begin.</div>
                  </section>
                )}
              </div>
              {filesMode ? <FilesView session={activeSession} /> : null}
              {mode === "diff" ? <DiffView session={activeSession} /> : null}
            </>
          )}
        </div>

        {rightRailView && !voiceLogOpen && sessionsMode ? (
          <RightRail
            session={rightRailView.session}
            turn={rightRailView.turn}
            subagent={rightRailView.subagent}
            scrollRef={rightRailScrollRef}
            focusEventId={rightRailView.focusEventId}
            focusKey={rightRailView.focusKey}
            onClose={closeRightRail}
          />
        ) : null}
        {voiceRailOpen && voiceTurnId ? <VoiceTurnRail turnId={voiceTurnId} scrollRef={voiceRailRef} /> : null}

        <CommandPalette
          sessionId={activeSession?.id ?? null}
          hasSessions={pinnedSessions.length + unpinnedSessions.length > 0}
          supportsFork={!!activeSession?.supportsFork}
          pinned={pinnedSessions.some((session) => session.id === activeSession?.id)}
        />

        {showNewSession && (
          <NewSessionModal
            onCancel={() => setShowNewSession(false)}
            onCreate={createSession}
          />
        )}

        <FindInHistoryModal
          open={showFindInSessions}
          onCancel={() => setShowFindInSessions(false)}
          onSelect={(hit) => {
            setShowFindInSessions(false);
            void window.birdsong.navigateToEvent(hit.sessionId, hit.turnId, hit.eventId);
          }}
        />
      </div>
    </SubagentOpenContext.Provider>
  );
}
