import type { SessionDeps } from "./SessionDeps";

/** Open or reopen a session and hydrate its transcript before navigation. */
export async function openSession(
  { state, persistence, hydration, agents }: SessionDeps,
  sessionId: string,
): Promise<boolean> {
  if (!state.sessions.has(sessionId)) {
    if (!(await hydration.reopen(sessionId))) {
      hydration.forgetMissing(sessionId);
      return false;
    }
  } else if (!(await hydration.ensure(sessionId))) {
    return false;
  }
  state.setActiveTabId(sessionId);
  state.emitSessions();
  state.pushTranscript(sessionId);
  void persistence.persist();
  agents.refreshCommandsIfNeeded(sessionId);
  return true;
}
