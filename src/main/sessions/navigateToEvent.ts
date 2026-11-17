import type { SessionDeps } from "./SessionDeps";
import { openSession } from "./openSession";

/** Open (or reopen) a session and scroll the renderer to one event. */
export async function navigateToEvent(
  deps: SessionDeps,
  sessionId: string,
  turnId: string,
  eventId: string,
): Promise<void> {
  if (await openSession(deps, sessionId)) {
    deps.state.send("navigate-event", { sessionId, turnId, eventId });
  }
}
