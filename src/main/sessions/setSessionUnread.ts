import type { SessionState } from "./SessionState";

/** Show or clear a session's unread dot, in the rail and on the phone. */
export function setSessionUnread(state: SessionState, sessionId: string, unread: boolean): void {
  const session = state.sessions.get(sessionId);
  if (!session || !!session.unread === unread) return;
  session.unread = unread;
  state.emitSessions();
}
