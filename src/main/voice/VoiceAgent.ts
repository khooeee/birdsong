import type { BrowserWindow } from "electron";
import { errorMessage } from "../../shared/errorMessage";
import type { Session } from "../../shared/session";
import type { VoiceConnectionEvent } from "../../shared/voiceConnectionEvent";
import type { VoiceStatus } from "../../shared/voiceStatus";
import type { SessionManager } from "../sessions/SessionManager";
import type { SessionObserver } from "../sessions/SessionObserver";
import { answerToolCall } from "./answerToolCall";
import { appendVoiceLog } from "./appendVoiceLog";
import { createVoiceTools } from "./createVoiceTools";
import { CurrentVoiceCall } from "./CurrentVoiceCall";
import { prepareVoiceCall } from "./prepareVoiceCall";
import { VoiceAnnouncer } from "./VoiceAnnouncer";
import { VoiceCallMessages } from "./VoiceCallMessages";
import { VoiceConversation } from "./VoiceConversation";
import { VoiceSessionBinding } from "./VoiceSessionBinding";
import { VoiceIdleTimer } from "./VoiceIdleTimer";
import { VoiceNotices } from "./VoiceNotices";
import { VoiceRendererLink } from "./VoiceRendererLink";
import { VoiceServerEvents } from "./VoiceServerEvents";
import { voiceSessionConfig } from "./voiceSessionConfig";
import type { VoiceToolContext } from "./VoiceToolContext";

type Deps = {
  sessions: SessionManager;
  getWindow: () => BrowserWindow | null;
};
type VoicePeer = VoiceStatus["peer"];

const MAX_RETRIES = 3;
/** The phone reconnects on its own; give up if it has not opened a call by then. */
const PHONE_WAIT_MINUTES = 1;

/**
 * The voice agent, on one session at a time. A peer (this window's renderer, or the iOS app) owns the WebRTC
 * audio; this owns the key, and drives the call over its sideband: session config, tools, notices and listening
 * state. Whoever starts voice is the peer; the phone starting on the same session takes over from the desktop.
 */
export class VoiceAgent {
  private status: VoiceStatus = { state: "off", activity: "idle", error: null, peer: "desktop", sessionId: null };
  private readonly conversation = new VoiceConversation();
  private readonly link: VoiceRendererLink;
  private readonly notices: VoiceNotices;
  private readonly announcer: VoiceAnnouncer;
  private readonly tools: VoiceToolContext;
  private readonly serverEvents: VoiceServerEvents;
  private readonly binding: VoiceSessionBinding;
  private readonly messages: VoiceCallMessages;
  private readonly idle = new VoiceIdleTimer((minutes) => {
    appendVoiceLog("state", { idleMinutes: minutes });
    this.stop();
  });
  private readonly phoneWait = new VoiceIdleTimer(() => {
    if (this.status.peer === "phone" && this.status.state === "connecting") this.fail("Lost the connection to the phone.");
  });
  private readonly call = new CurrentVoiceCall({
    onEvent: (event) => {
      if (this.status.state !== "off") this.serverEvents.handle(event);
    },
    onEnded: (reason) => this.callEnded(reason),
  });
  private key: string | null = null;
  /** The peer's media is up. */
  private channelOpen = false;
  /** Opened at least once since start, so drops reconnect instead of failing. */
  private opened = false;
  private retries = 0;
  private reconnecting = false;
  /** Bumped on every start, so a reconnect waiting out its backoff can tell voice restarted meanwhile. */
  private run = 0;

  constructor(private readonly deps: Deps) {
    this.link = new VoiceRendererLink(deps.getWindow);
    this.messages = new VoiceCallMessages(this.call, this.conversation, deps.sessions);
    const connected = () => this.channelOpen && this.status.state === "listening";
    this.notices = new VoiceNotices(
      () => this.status.state !== "off",
      (quietMs) => connected() && this.conversation.isQuiet(quietMs),
      (text) => this.messages.notice(text),
    );
    this.announcer = new VoiceAnnouncer(deps.sessions, this.notices, () => this.voicedId());
    this.binding = new VoiceSessionBinding(deps.sessions, {
      onClosed: () => this.stop(),
      onRenamed: (session) => this.messages.renamed(session),
    });
    this.tools = createVoiceTools({
      ...deps,
      questions: this.announcer.questions,
      notices: this.notices,
      sessionId: () => this.voicedId(),
      key: () => this.key,
      stopVoice: () => this.stop(),
    });
    this.serverEvents = new VoiceServerEvents(this.conversation, {
      setStatus: (patch) => this.setStatus(patch),
      resetIdle: () => this.resetIdle(),
      pokeNotices: () => this.notices.poke(),
      runTool: (event) => answerToolCall(event, this.call, this.tools, this.conversation.trigger),
    });
  }

  get observer(): SessionObserver {
    return this.announcer;
  }

  /** Speak a due reminder of the session voice is on; false for any other (or while voice is off). */
  announceReminder(message: string, session: Session | undefined): boolean {
    return this.announcer.reminder(message, session);
  }

  getStatus(): VoiceStatus {
    return { ...this.status };
  }

  /** A session's mic: stop voice on that session (wherever it is), else start it there on this Mac. */
  async toggle(sessionId: string): Promise<void> {
    if (this.voicedId() === sessionId) return this.stop();
    await this.start(sessionId);
  }

  /** Start on this Mac; voice on another session stops first, so each session starts fresh. */
  async start(sessionId: string): Promise<void> {
    this.binding.require(sessionId);
    this.stop();
    this.begin("desktop", sessionId);
    await this.connect();
  }

  /**
   * The phone starts voice on a session (taking it over from the desktop, conversation and all, when it is the
   * same session), or resumes after its call dropped. Returns ICE servers for its peer; null refuses a resume
   * because voice was stopped or moved meanwhile.
   */
  async startPhone(sessionId: string, resume: boolean, reason?: string): Promise<RTCIceServer[] | null> {
    const phoneOn = this.voicedId() === sessionId && this.status.peer === "phone";
    if (resume && !phoneOn) return null;
    this.binding.require(sessionId);
    if (this.voicedId() !== sessionId) this.stop();
    if (this.status.state === "off") this.begin("phone", sessionId);
    else if (this.status.peer === "desktop") this.link.command({ type: "disconnect" });
    this.setStatus({ peer: "phone" });
    appendVoiceLog("state", { peer: "phone", ...(resume && { resume: reason ?? true }) });
    try {
      const iceServers = await this.prepare();
      if (!iceServers) return null;
      this.phoneWait.reset(PHONE_WAIT_MINUTES);
      return iceServers;
    } catch (error) {
      this.fail(errorMessage(error));
      throw error;
    }
  }

  /** The phone's stop button only stops voice it owns. */
  stopPhone(): void {
    if (this.status.peer === "phone") this.stop();
  }

  stop(): void {
    if (this.status.state === "off") return;
    if (this.status.peer === "desktop") this.link.command({ type: "disconnect" });
    this.endCall();
    this.key = null;
    this.phoneWait.clear();
    this.idle.clear();
    this.notices.clear();
    this.setStatus({ state: "off", activity: "idle", error: null });
    appendVoiceLog("state", { state: "off" });
    this.binding.clear();
  }

  /** The peer's SDP offer → Inworld's answer, with main attached to the call (the key never leaves main). */
  async answer(offer: string, peer: VoicePeer): Promise<string> {
    const key = this.key;
    if (!key || this.status.state !== "connecting" || this.status.peer !== peer) throw new Error("Voice is not connecting.");
    const session = this.binding.require(this.status.sessionId ?? "");
    const answer = await this.call.open(key, offer);
    // Configured before the peer connects, so the first thing the user says reaches the real agent.
    this.serverEvents.listening(this.opened);
    this.call.send(voiceSessionConfig(this.deps.sessions.getSettings(), session));
    return answer;
  }

  /** Settings changed the speaking voice: switch a live call now (desktop or phone); new calls read settings. */
  voiceChanged(): void {
    if (this.status.state !== "off") this.messages.voiceChanged();
  }

  /** The peer's media is up. */
  open(peer: VoicePeer): void {
    if (this.status.state !== "connecting" || this.status.peer !== peer || !this.call.current) return;
    const reconnected = this.opened;
    this.channelOpen = true;
    this.opened = true;
    this.retries = 0;
    this.phoneWait.clear();
    if (reconnected) this.messages.replayHistory();
    this.setStatus({ state: "listening", activity: "idle", error: null });
    this.resetIdle();
    this.notices.poke();
  }

  /** The renderer's peer; ignored while the phone has voice. */
  handleConnection(event: VoiceConnectionEvent): void {
    if (this.status.peer !== "desktop") return;
    if (event.type === "open") return this.open("desktop");
    if (this.status.state === "off") return;
    const reason = event.type === "failed" ? event.error : event.type === "ready" ? "The window reloaded." : "The connection closed.";
    void this.reconnect(reason);
  }

  private begin(peer: VoicePeer, sessionId: string): void {
    this.binding.set(sessionId);
    this.conversation.reset();
    this.run += 1;
    this.opened = false;
    this.retries = 0;
    this.reconnecting = false;
    this.setStatus({ peer, sessionId });
  }

  /** The session voice is on, or null while it is off. */
  private voicedId(): string | null {
    return this.status.state === "off" ? null : this.status.sessionId;
  }

  private async connect(): Promise<void> {
    try {
      const iceServers = await this.prepare();
      if (iceServers) this.link.command({ type: "connect", iceServers });
    } catch (error) {
      this.fail(errorMessage(error));
    }
  }

  /** Key, mic access and ICE servers for a new call; null if voice stopped meanwhile. */
  private async prepare(): Promise<RTCIceServer[] | null> {
    this.endCall();
    this.setStatus({ state: "connecting", activity: "idle", error: null });
    const { key, iceServers } = await prepareVoiceCall(this.status.peer === "desktop", () => this.link.openSettings());
    if (this.status.state !== "connecting") return null;
    this.key = key;
    return iceServers;
  }

  /** The sideband is gone: the desktop reconnects; the phone resumes by itself once it can. */
  private callEnded(reason: string): void {
    if (this.status.state === "off") return;
    if (this.status.peer === "desktop") return void this.reconnect(reason);
    appendVoiceLog("error", { error: reason });
    this.endCall();
    this.setStatus({ state: "connecting", activity: "idle" });
    this.phoneWait.reset(PHONE_WAIT_MINUTES);
  }

  /** Drops after a successful open retry with backoff; failures before the first open are final. */
  private async reconnect(reason: string): Promise<void> {
    if (this.reconnecting) return;
    appendVoiceLog("error", { error: reason });
    if (!this.opened || this.retries >= MAX_RETRIES) return this.fail(reason);
    this.retries += 1;
    this.reconnecting = true;
    const run = this.run;
    this.endCall();
    this.link.command({ type: "disconnect" });
    this.setStatus({ state: "connecting", activity: "idle" });
    await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** (this.retries - 1)));
    if (run !== this.run) return;
    this.reconnecting = false;
    if (this.status.state !== "connecting" || this.status.peer !== "desktop") return;
    await this.connect();
  }

  private endCall(): void {
    this.channelOpen = false;
    this.call.end();
  }

  private fail(error: string): void {
    appendVoiceLog("error", { error, fatal: true });
    this.stop();
    this.setStatus({ error });
  }

  /** Only while listening; connecting and off never time out. */
  private resetIdle(): void {
    if (this.status.state === "listening") this.idle.reset(this.deps.sessions.getSettings().voiceIdleMinutes);
    else this.idle.clear();
  }

  private setStatus(patch: Partial<VoiceStatus>): void {
    const next = { ...this.status, ...patch };
    const same = (Object.keys(next) as (keyof VoiceStatus)[]).every((key) => next[key] === this.status[key]);
    if (same) return;
    this.status = next;
    this.link.status(this.getStatus());
  }
}
