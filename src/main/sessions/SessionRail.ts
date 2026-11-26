import { pinSessionInLists } from "../railLists/pinSessionInLists";
import { unpinSessionInLists } from "../railLists/unpinSessionInLists";
import { softCloseSession } from "./softCloseSession";
import type { SessionDeps } from "./SessionDeps";
import { softCloseHost } from "./softCloseHost";

/** Pin, unpin, rename and close sessions in the rail. Home stays: it can't be unpinned or closed. */
export class SessionRail {
  constructor(private readonly deps: SessionDeps) {}

  pin(sessionId: string): boolean {
    const { state, persistence } = this.deps;
    if (!state.sessions.has(sessionId)) return false;
    state.railLists = pinSessionInLists(state.railLists, sessionId);
    state.emitSessions();
    void persistence.persist();
    return state.railLists.pinnedIds.includes(sessionId);
  }

  unpin(sessionId: string): void {
    const { state, persistence } = this.deps;
    if (!state.sessions.has(sessionId)) return;
    if (sessionId === state.homeId) throw new Error("Home stays pinned at the top.");
    state.railLists = unpinSessionInLists(state.railLists, sessionId);
    state.emitSessions();
    void persistence.persist();
  }

  rename(sessionId: string, title: string): void {
    const { state, persistence } = this.deps;
    const session = state.sessions.get(sessionId);
    if (!session) return;
    // The user's own title is never replaced by the agent's.
    if (title !== session.title) session.autoTitle = undefined;
    session.title = title;
    state.emitSessions();
    void persistence.persist();
  }

  async close(sessionId: string): Promise<void> {
    const { state, persistence } = this.deps;
    if (!state.sessions.has(sessionId)) return;
    if (sessionId === state.homeId) throw new Error("Home can't be closed. Use Start Fresh for a new Home chat.");
    await softCloseSession(softCloseHost(this.deps), sessionId);
    state.emitSessions();
    void persistence.persist();
  }
}
