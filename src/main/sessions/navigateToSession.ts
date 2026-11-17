import type { SessionDeps } from "./SessionDeps";
import { openSession } from "./openSession";

/** Session links always land at the bottom, including links to the active session. */
export async function navigateToSession(deps: SessionDeps, sessionId: string): Promise<void> {
  if (await openSession(deps, sessionId)) {
    deps.state.send("navigate-session", { sessionId });
  }
}
