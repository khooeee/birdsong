import type { BrowserWindow } from "electron";
import { errorMessage } from "../../shared/errorMessage";
import type { Session } from "../../shared/session";
import type { VoiceConnectionEvent } from "../../shared/voiceConnectionEvent";
import type { VoiceStatus } from "../../shared/voiceStatus";
import type { SessionManager } from "../sessions/SessionManager";
import type { SessionObserver } from "../sessions/SessionObserver";
import { appendVoiceLog } from "./appendVoiceLog";
import { clipText } from "../../shared/clipText";
import { CurrentVoiceCall } from "./CurrentVoiceCall";
import { prepareVoiceCall } from "./prepareVoiceCall";
import { runVoiceSearch } from "./runVoiceSearch";
import { runVoiceTool } from "./runVoiceTool";
import { VoiceAnnouncer } from "./VoiceAnnouncer";
import { VoiceConversation } from "./VoiceConversation";
import { VoiceIdleTimer } from "./VoiceIdleTimer";
import { voiceLogFeed } from "./voiceLogFeed";
import { voiceNoticeText } from "./voiceNoticeText";
import { VoiceNotices } from "./VoiceNotices";
import { VoiceRendererLink } from "./VoiceRendererLink";
import { VoiceServerEvents } from "./VoiceServerEvents";
import { voiceSessionConfig } from "./voiceSessionConfig";
import type { VoiceToolContext } from "./VoiceToolContext";
import { voiceUserMessage } from "./voiceUserMessage";

type Deps = {
  sessions: SessionManager;
  getWindow: () => BrowserWindow | null;
};
type ServerEvent = Record<string, unknown>;
type VoicePeer = VoiceStatus["peer"];

const MAX_RETRIES = 3;
/** The phone reconnects on its own; give up if it has not opened a call by then. */
const PHONE_WAIT_MINUTES = 1;

/**
 * The global voice agent. A peer (this window's renderer, or the iOS app) owns the WebRTC audio; this owns
 * the key, and drives the call over its sideband: session config, tools, notices and listening state.
 * Whoever starts voice is the peer; the phone starting takes over from the desktop.
 */
export class VoiceAgent {
  private status: VoiceStatus = { state: "off", activity: "idle", error: null, peer: "desktop" };
  private readonly conversation = new VoiceConversation();
  private readonly link: VoiceRendererLink;
  private readonly notices: VoiceNotices;
  private readonly announcer: VoiceAnnouncer;
  private readonly tools: VoiceToolContext;
  private readonly serverEvents: VoiceServerEvents;
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

  constructor(private readonly deps: Deps) {
    this.link = new VoiceRendererLink(deps.getWindow);
    voiceLogFeed.subscribe((entry) => this.link.logEntry(entry));
    const connected = () => this.channelOpen && this.status.state === "listening";
    this.notices = new VoiceNotices(
      () => this.status.state !== "off",
      (quietMs) => connected() && this.conversation.isQuiet(quietMs),
      (text) => this.deliverNotice(text),
    );
    this.announcer = new VoiceAnnouncer(deps.sessions, this.notices, () => this.status.state !== "off");
    this.tools = {
      sessions: deps.sessions,
      focus: { sessionId: null, numbered: [] },
      questions: this.announcer.questions,
      startSearch: (query, depth) => {
        if (this.key) runVoiceSearch(this.key, deps.sessions.getSettings().voiceModel, query, depth, this.notices);
      },
      stopVoice: () => this.stop(),
    };
    this.serverEvents = new VoiceServerEvents(this.conversation, {
      setStatus: (patch) => this.setStatus(patch),
      resetIdle: () => this.resetIdle(),
      pokeNotices: () => this.notices.poke(),
      runTool: (event) => this.runTool(event),
    });
  }

  get observer(): SessionObserver {
    return this.announcer;
  }

  /** Speak a due reminder; false while voice is off. */
  announceReminder(message: string, session: Session | undefined): boolean {
    if (this.status.state === "off") return false;
    this.notices.push(voiceNoticeText.reminder(message, session));
    return true;
  }

  getStatus(): VoiceStatus {
    return { ...this.status };
  }

  /** Button and menu: start on this Mac when off, otherwise stop (wherever voice is). */
  async toggle(): Promise<void> {
    if (this.status.state === "off") return this.start();
    this.stop();
  }

  async start(): Promise<void> {
    if (this.status.state !== "off") return;
    this.begin("desktop");
    await this.connect();
  }

  /**
   * The phone starts voice (taking it over from the desktop, conversation and all), or resumes after its call
   * dropped. Returns ICE servers for its peer; null refuses a resume because voice was stopped meanwhile.
   */
  async startPhone(resume: boolean, reason?: string): Promise<RTCIceServer[] | null> {
    const phoneOn = this.status.state !== "off" && this.status.peer === "phone";
    if (resume && !phoneOn) return null;
    if (this.status.state === "off") this.begin("phone");
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
  }

  /** The peer's SDP offer → Inworld's answer, with main attached to the call (the key never leaves main). */
  async answer(offer: string, peer: VoicePeer): Promise<string> {
    const key = this.key;
    if (!key || this.status.state !== "connecting" || this.status.peer !== peer) throw new Error("Voice is not connecting.");
    const answer = await this.call.open(key, offer);
    // Configured before the peer connects, so the first thing the user says reaches the real agent.
    this.serverEvents.listening(this.opened);
    this.call.send(voiceSessionConfig(this.deps.sessions.getSettings()));
    return answer;
  }

  /** The peer's media is up. */
  open(peer: VoicePeer): void {
    if (this.status.state !== "connecting" || this.status.peer !== peer || !this.call.current) return;
    const reconnected = this.opened;
    this.channelOpen = true;
    this.opened = true;
    this.retries = 0;
    this.phoneWait.clear();
    if (reconnected && this.conversation.history.length) {
      this.call.send(voiceUserMessage(`${VoiceNotices.HEADER} ${voiceNoticeText.reconnected(this.conversation.history)}`));
    }
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

  private begin(peer: VoicePeer): void {
    this.conversation.reset();
    this.opened = false;
    this.retries = 0;
    this.setStatus({ peer });
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
    this.endCall();
    this.link.command({ type: "disconnect" });
    this.setStatus({ state: "connecting", activity: "idle" });
    await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** (this.retries - 1)));
    this.reconnecting = false;
    if (this.status.state !== "connecting" || this.status.peer !== "desktop") return;
    await this.connect();
  }

  private endCall(): void {
    this.channelOpen = false;
    this.call.end();
  }

  private fail(error: string): void {
    this.stop();
    this.setStatus({ error });
    appendVoiceLog("error", { error, fatal: true });
  }

  private async runTool(event: ServerEvent): Promise<void> {
    const callId = String(event.call_id ?? "");
    const name = String(event.name ?? "");
    const args = String(event.arguments ?? "");
    if (!callId) return;
    const call = this.call.current;
    const trigger = this.conversation.trigger;
    const output = await runVoiceTool(this.tools, name, args, trigger);
    appendVoiceLog("tool", { name, args: clipText(args, 500), trigger, output: clipText(output, 800) });
    // A new call after a reconnect never asked for this output.
    if (!call || call !== this.call.current) return;
    call.send({ type: "conversation.item.create", item: { type: "function_call_output", call_id: callId, output } });
  }

  /** Speak queued notices; the response they trigger may not change sessions (runVoiceTool). */
  private deliverNotice(text: string): void {
    this.conversation.trigger = "notice";
    this.conversation.responseStarted();
    this.call.send(voiceUserMessage(text));
    this.call.send({ type: "response.create" });
    appendVoiceLog("notice", { text: clipText(text, 2000) });
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
