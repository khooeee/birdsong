import type { CursorAskQuestionRequest } from "../../shared/agentRequests";
import { agentTurns } from "../../shared/agentTurns";
import type { Session } from "../../shared/session";
import type { SessionManager } from "../sessions/SessionManager";
import type { SessionObserver } from "../sessions/SessionObserver";
import { voiceNoticeText } from "./voiceNoticeText";
import type { VoiceNotices } from "./VoiceNotices";

/**
 * Turns session events into voice notices: finished turns, questions and errors for the voice's own session,
 * and only "finished" for the others (never cron sessions).
 */
export class VoiceAnnouncer implements SessionObserver {
  /** Open agent questions by request id (kept while voice is off too, for get_status). */
  readonly questions = new Map<string, CursorAskQuestionRequest>();

  constructor(
    private readonly sessions: SessionManager,
    private readonly notices: VoiceNotices,
    /** The session voice is on, or null while it is off. */
    private readonly voicedId: () => string | null,
  ) {}

  promptComplete(sessionId: string): boolean {
    if (this.isVoiced(sessionId)) {
      void this.sessions.getTranscript(sessionId).then((turns) => {
        const turn = agentTurns(turns).at(-1);
        if (turn?.status === "complete") this.notices.push(voiceNoticeText.turnFinished(turn));
      });
      return true;
    }
    const other = this.voicedId() ? this.sessions.getSession(sessionId) : undefined;
    if (!other || other.cron) return false;
    this.notices.push(voiceNoticeText.otherFinished(other));
    return true;
  }

  askQuestion(request: CursorAskQuestionRequest): void {
    this.questions.set(request.requestId, request);
    if (this.isVoiced(request.sessionId)) this.notices.push(voiceNoticeText.question(request));
  }

  /** Speak a due reminder of the voice's session; false for any other, so it chimes instead. */
  reminder(message: string, session: Session | undefined): boolean {
    if (!session || !this.isVoiced(session.id)) return false;
    this.notices.push(voiceNoticeText.reminder(message));
    return true;
  }

  questionSettled(requestId: string): void {
    this.questions.delete(requestId);
  }

  sessionError(sessionId: string, error: string): void {
    if (this.isVoiced(sessionId)) this.notices.push(voiceNoticeText.sessionError(error));
  }

  /** Voice is on this session (even a cron one: the user chose it). */
  private isVoiced(sessionId: string): boolean {
    return sessionId === this.voicedId() && !!this.sessions.getSession(sessionId);
  }
}
