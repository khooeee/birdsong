import type { Session } from "../../shared/session";
import type { SessionManager } from "../sessions/SessionManager";
import { sessionLabel } from "./sessionLabel";
import { voiceLogSession } from "./voiceLogSession";

type Handlers = {
  /** The session was closed. */
  onClosed: () => void;
  /** It was renamed, so the call's instructions need its new title. */
  onRenamed: (session: Session) => void;
};

/**
 * Binds voice to its session: tags the voice log with it, and reports when it closes or is renamed (from the rail
 * updates SessionManager sends).
 */
export class VoiceSessionBinding {
  private sessionId: string | null = null;
  private title = "";

  constructor(private readonly sessions: SessionManager, private readonly handlers: Handlers) {
    sessions.subscribe((channel) => {
      if (channel === "sessions:changed") this.check();
    });
  }

  /** The open session by id, or throws for one that was closed meanwhile. */
  require(sessionId: string): Session {
    const session = this.sessions.getSession(sessionId);
    if (!session) throw new Error("That session is closed.");
    return session;
  }

  set(sessionId: string): void {
    const session = this.require(sessionId);
    this.sessionId = sessionId;
    this.title = session.title;
    voiceLogSession.set(sessionId, sessionLabel(session));
  }

  clear(): void {
    this.sessionId = null;
    this.title = "";
    voiceLogSession.clear();
  }

  private check(): void {
    if (!this.sessionId) return;
    const session = this.sessions.getSession(this.sessionId);
    if (!session) return this.handlers.onClosed();
    if (session.title === this.title) return;
    this.title = session.title;
    voiceLogSession.set(session.id, sessionLabel(session));
    this.handlers.onRenamed(session);
  }
}
