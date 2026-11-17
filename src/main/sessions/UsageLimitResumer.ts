import { errorMessage } from "../../shared/errorMessage";
import type { Session } from "../../shared/session";
import type { SessionState } from "./SessionState";

/** Longest single wait, so sleep and clock changes are noticed within a minute. */
const MAX_WAIT_MS = 60_000;
/** Resume this long after the reported reset, so a resume the agent still refuses is not retried at once. */
const RESET_SLACK_MS = 60_000;
const RESUME_PROMPT = "The usage limit has reset. Continue where you left off.";

/**
 * Continues sessions whose turn a usage limit stopped, once the limit resets. The due time lives on
 * the session (`resumeAt`, persisted), so a resume that came due while the app was closed or the
 * computer slept runs late rather than never.
 */
export class UsageLimitResumer {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly state: SessionState,
    private readonly prompt: (sessionId: string, text: string) => Promise<unknown>,
  ) {}

  start(): void {
    this.running = true;
    this.check();
  }

  stop(): void {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  /** Continue `session` once its limit resets at `resetAt` (epoch ms). */
  schedule(session: Session, resetAt: number): void {
    session.resumeAt = Math.max(resetAt, Date.now()) + RESET_SLACK_MS;
    this.state.emitSessions();
    this.check();
  }

  /** Drop a pending resume; returns whether there was one. */
  cancel(sessionId: string): boolean {
    const session = this.state.sessions.get(sessionId);
    if (!session || session.resumeAt === undefined) return false;
    session.resumeAt = undefined;
    this.state.emitSessions();
    return true;
  }

  /** Resume what is due, then wait for the next one. */
  private check = (): void => {
    if (!this.running) return;
    const now = Date.now();
    let nextDueMs = Infinity;
    for (const session of this.state.sessions.values()) {
      if (session.resumeAt === undefined) continue;
      if (session.resumeAt > now) {
        nextDueMs = Math.min(nextDueMs, session.resumeAt);
        continue;
      }
      session.resumeAt = undefined;
      void this.prompt(session.id, RESUME_PROMPT).catch((error) => {
        console.warn(`[usage limit] resuming ${session.id} failed:`, errorMessage(error));
      });
    }
    if (this.timer) clearTimeout(this.timer);
    this.timer = nextDueMs === Infinity ? null : setTimeout(this.check, Math.min(MAX_WAIT_MS, nextDueMs - now));
  };
}
