import type { Session } from "../../shared/session";
import type { VoiceToolContext } from "./VoiceToolContext";

type Voiced = { ok: true; session: Session } | { ok: false; error: string };

/** The session voice is on, while it is still open. */
export function voicedSession(ctx: VoiceToolContext): Voiced {
  const sessionId = ctx.sessionId();
  const session = sessionId ? ctx.sessions.getSession(sessionId) : undefined;
  return session ? { ok: true, session } : { ok: false, error: "This session is closed." };
}
