import { isRecord } from "../../shared/isRecord";
import { appendVoiceLog } from "./appendVoiceLog";
import { exchangeVoiceSdp } from "./exchangeVoiceSdp";
import { inworldRequest } from "./inworldRequest";

type Handlers = {
  onEvent: (event: Record<string, unknown>) => void;
  /** The sideband dropped and could not reattach: the call ended, or Inworld is unreachable. */
  onEnded: (reason: string) => void;
};

const SIDEBAND_URL = "wss://api.inworld.ai/v1/realtime";
const ATTACH_TIMEOUT_MS = 10_000;
/** Waits before each reattach; a call that has ended refuses them all. */
const REATTACH_DELAYS_MS = [500, 1500, 3000];

/**
 * One Inworld realtime call as main sees it. The peer (renderer or phone) carries the audio; main attaches a
 * sideband WebSocket that receives the call's events and sends its own (session config, tool output, notices).
 */
export class VoiceCall {
  private callId: string | null = null;
  private socket: WebSocket | null = null;
  private ended = false;

  constructor(
    private readonly key: string,
    private readonly handlers: Handlers,
  ) {}

  /** Create the call from the peer's offer and attach the sideband; returns Inworld's answer. */
  async answer(offer: string): Promise<string> {
    const { answer, callId } = await exchangeVoiceSdp(this.key, offer);
    this.callId = callId;
    try {
      await this.attach();
    } catch (error) {
      this.end();
      throw error;
    }
    return answer;
  }

  send(event: object): void {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(event));
  }

  /** Close the sideband and hang up, so the peer sees its connection close. */
  end(): void {
    if (this.ended) return;
    this.ended = true;
    this.socket?.close();
    this.socket = null;
    if (!this.callId) return;
    // 404 when the call already ended.
    void inworldRequest(this.key, `/v1/realtime/calls/${encodeURIComponent(this.callId)}/hangup`, {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
    }).catch(() => undefined);
  }

  private attach(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Node's WebSocket (undici) takes headers; the DOM typings only know subprotocols.
      const init = { headers: { Authorization: `Basic ${this.key}` } } as unknown as string[];
      const socket = new WebSocket(`${SIDEBAND_URL}?call_id=${encodeURIComponent(this.callId ?? "")}`, init);
      let opened = false;
      const timeout = setTimeout(() => socket.close(), ATTACH_TIMEOUT_MS);
      socket.onopen = () => {
        clearTimeout(timeout);
        if (this.ended) return socket.close();
        opened = true;
        this.socket = socket;
        resolve();
      };
      socket.onmessage = (message) => {
        if (socket === this.socket) this.receive(message.data);
      };
      socket.onclose = () => {
        clearTimeout(timeout);
        if (!opened) return reject(new Error("Could not attach to the voice call."));
        if (socket === this.socket) void this.dropped();
      };
    });
  }

  /** A sideband can drop while the call carries on, so reattach before giving up on it. */
  private async dropped(): Promise<void> {
    this.socket = null;
    for (const delay of REATTACH_DELAYS_MS) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      if (this.ended) return;
      try {
        await this.attach();
        appendVoiceLog("state", { sideband: "reattached" });
        return;
      } catch {
        // Try again, then report the call ended.
      }
    }
    if (!this.ended) this.handlers.onEnded("The voice call ended.");
  }

  private receive(data: unknown): void {
    if (typeof data !== "string") return;
    try {
      const event = JSON.parse(data) as unknown;
      // Main never reads streaming deltas.
      if (isRecord(event) && typeof event.type === "string" && !event.type.endsWith(".delta")) this.handlers.onEvent(event);
    } catch {
      // Not JSON; nothing main can use.
    }
  }
}
