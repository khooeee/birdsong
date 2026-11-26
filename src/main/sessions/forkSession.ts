import type { Session } from "../../shared/session";
import { forkSessionAtEvent } from "./forkSessionAtEvent";
import type { SessionDeps } from "./SessionDeps";

/** Fork a session (optionally at an event) into a new rail entry that keeps the source's pin. */
export async function forkSession(
  { state, persistence, hydration, agents }: SessionDeps,
  sessionId: string,
  eventId?: string,
  focus = true,
): Promise<Session> {
  if (!(await hydration.ensure(sessionId))) throw new Error("Session not found");
  // A fork of a pinned session is pinned too; an unpinned source forks unpinned.
  const pin = state.railLists.pinnedIds.includes(sessionId);
  return forkSessionAtEvent({
    getSession: (id) => state.sessions.get(id),
    getTranscript: (id) => state.transcripts.get(id) ?? [],
    listTitles: () => [...state.sessions.values()].map((session) => session.title),
    ensureSession: async (session) => agents.ensureSession(session),
    forkSupport: (agent) => state.forkSupport.flags(agent),
    callbacksFor: (session) => agents.callbacksFor(session),
    setSession: (id, session) => { state.agents.set(id, session); },
    addSession: (session, transcript) => {
      state.prependSession(session, pin);
      state.transcripts.set(session.id, transcript);
      state.hydrated.add(session.id);
      void state.subagentTranscripts.copySession(sessionId, session.id).catch(() => undefined);
    },
    setActiveSession: (id) => { if (focus) state.activeTabId = id; },
    emitSessions: () => state.emitSessions(),
    send: (channel, payload) => state.send(channel, payload),
    persist: () => persistence.persist(),
  }, sessionId, eventId);
}
