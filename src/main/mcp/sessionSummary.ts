import type { Session } from "../../shared/session";

/** What an agent needs to know about a session; `self` marks the caller's own, `home` the user's Home session. */
export function sessionSummary(session: Session, callerId: string) {
  return {
    id: session.id,
    title: session.title,
    agent: session.agent,
    cwd: session.cwd,
    workingFolders: session.workingFolders,
    status: session.status,
    ...(session.error ? { error: session.error } : {}),
    ...(session.id === callerId ? { self: true } : {}),
    ...(session.home ? { home: true } : {}),
  };
}
