import type { BrowserWindow } from "electron";
import type { ActiveTabId } from "../../shared/activeTabId";
import type { Session } from "../../shared/session";
import type { TranscriptTurn } from "../../shared/transcript";
import type { AcpSession } from "../acp/session";
import { WarmSessionPool } from "../acp/WarmSessionPool";
import { AgentForkSupport } from "../acp/AgentForkSupport";
import { prependPinnedInLists } from "../railLists/prependPinnedInLists";
import { prependUnpinnedInLists } from "../railLists/prependUnpinnedInLists";
import { keepHomeFirst } from "../railLists/keepHomeFirst";
import type { SessionRailLists } from "../railLists/SessionRailLists";
import { SubagentTranscriptStore } from "./SubagentTranscriptStore";
import type { SessionObserver } from "./SessionObserver";
import type { SessionEventListener } from "./SessionEventListener";

/** In-memory session state shared by SessionManager collaborators, plus renderer IPC. */
export class SessionState {
  sessions = new Map<string, Session>();
  private lists: SessionRailLists = { pinnedIds: [], unpinnedIds: [] };
  private home: string | null = null;
  agents = new Map<string, AcpSession>();
  transcripts = new Map<string, TranscriptTurn[]>();
  subagentTranscripts = new SubagentTranscriptStore();
  hydrated = new Set<string>();
  activeTabId: ActiveTabId = null;
  window: BrowserWindow | null = null;
  askOwners = new Map<string, string>();
  warm = new WarmSessionPool<AcpSession>();
  forkSupport = new AgentForkSupport();
  observer: SessionObserver | null = null;
  /** Main-process taps on every renderer event (remote clients). */
  listeners = new Set<SessionEventListener>();

  /** Rail order. Every write keeps Home first, so pinning, forking and reopening never move it. */
  get railLists(): SessionRailLists {
    return this.lists;
  }

  set railLists(lists: SessionRailLists) {
    this.lists = keepHomeFirst(lists, this.home);
  }

  /** The Home session's id, or null while Home is off or being replaced. */
  get homeId(): string | null {
    return this.home;
  }

  set homeId(id: string | null) {
    this.home = id;
    this.lists = keepHomeFirst(this.lists, id);
  }

  /** Put a session in the main panel, which reads it. */
  setActiveTabId(id: ActiveTabId): void {
    this.activeTabId = id;
    const session = this.activeSession();
    if (session?.unread) session.unread = false;
  }

  setRailLists(lists: SessionRailLists): void {
    this.railLists = lists;
  }

  /** The session in the main panel, if any. */
  activeSession(): Session | null {
    return this.activeTabId ? this.sessions.get(this.activeTabId) ?? null : null;
  }

  prependSession(session: Session, pin = false): void {
    this.sessions.set(session.id, session);
    this.railLists = pin
      ? prependPinnedInLists(this.railLists, session.id)
      : prependUnpinnedInLists(this.railLists, session.id);
  }

  bumpSession(sessionId: string): void {
    this.railLists = this.railLists.pinnedIds.includes(sessionId)
      ? prependPinnedInLists(this.railLists, sessionId)
      : prependUnpinnedInLists(this.railLists, sessionId);
  }

  /** A session with its agent's current fork flags and Home mark, as lists and the control API report it. */
  sessionPayload(session: Session): Session {
    return {
      ...session,
      ...this.forkSupport.flags(session.agent),
      ...(session.id === this.home ? { home: true } : {}),
    };
  }

  sessionListPayload() {
    const map = (ids: string[]) =>
      ids
        .map((id) => this.sessions.get(id))
        .filter((session): session is Session => !!session)
        .map((session) => this.sessionPayload(session));
    return {
      pinned: map(this.railLists.pinnedIds),
      unpinned: map(this.railLists.unpinnedIds),
      activeTabId: this.activeTabId,
    };
  }

  emitSessions(): void {
    this.send("sessions:changed", this.sessionListPayload());
  }

  /** Push the in-memory transcript so the renderer cannot show a stale empty list. */
  pushTranscript(sessionId: string): void {
    this.send("transcript:reset", {
      sessionId,
      turns: this.transcripts.get(sessionId) ?? [],
    });
  }

  send(channel: string, payload: unknown): void {
    this.window?.webContents.send(channel, payload);
    for (const listener of this.listeners) listener(channel, payload);
  }
}
