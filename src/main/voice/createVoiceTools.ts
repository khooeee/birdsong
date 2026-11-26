import type { CursorAskQuestionRequest } from "../../shared/agentRequests";
import type { SessionManager } from "../sessions/SessionManager";
import { runVoiceSearch } from "./runVoiceSearch";
import type { VoiceNotices } from "./VoiceNotices";
import type { VoiceToolContext } from "./VoiceToolContext";

type Deps = {
  sessions: SessionManager;
  questions: Map<string, CursorAskQuestionRequest>;
  notices: VoiceNotices;
  sessionId: () => string | null;
  /** The live call's key; searches need it. */
  key: () => string | null;
  stopVoice: () => void;
};

/** What the voice agent's tools act on: its session, open questions, background search, and stopping voice. */
export function createVoiceTools({ sessions, questions, notices, sessionId, key, stopVoice }: Deps): VoiceToolContext {
  return {
    sessions,
    sessionId,
    questions,
    startSearch: (query, depth) => {
      const current = key();
      if (current) runVoiceSearch(current, sessions.getSettings().voiceModel, query, depth, notices);
    },
    stopVoice,
  };
}
