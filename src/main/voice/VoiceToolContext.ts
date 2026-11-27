import type { CursorAskQuestionRequest } from "../../shared/agentRequests";
import type { SessionManager } from "../sessions/SessionManager";

/** What voice tools can read and change. */
export interface VoiceToolContext {
  sessions: SessionManager;
  /** The session voice belongs to; every session tool acts on it. */
  sessionId: () => string | null;
  /** Open agent questions by request id. */
  questions: Map<string, CursorAskQuestionRequest>;
  /** Run a web search in the background; the answer arrives as a notice. */
  startSearch: (query: string, depth: "quick" | "deep") => void;
  stopVoice: () => void;
}
