import { VoiceCall } from "./VoiceCall";

type Handlers = {
  onEvent: (event: Record<string, unknown>) => void;
  onEnded: (reason: string) => void;
};

/** The agent's one live call: a new call hangs up the old one, and only the current call's events get through. */
export class CurrentVoiceCall {
  private call: VoiceCall | null = null;

  constructor(private readonly handlers: Handlers) {}

  /** Compare later to tell whether the call was replaced meanwhile. */
  get current(): VoiceCall | null {
    return this.call;
  }

  /** Create a call from the peer's offer and return Inworld's answer; throws if replaced or ended meanwhile. */
  async open(key: string, offer: string): Promise<string> {
    this.end();
    const call: VoiceCall = new VoiceCall(key, {
      onEvent: (event) => {
        if (call === this.call) this.handlers.onEvent(event);
      },
      onEnded: (reason) => {
        if (call === this.call) this.handlers.onEnded(reason);
      },
    });
    this.call = call;
    try {
      const answer = await call.answer(offer);
      if (call !== this.call) throw new Error("Voice is not connecting.");
      return answer;
    } catch (error) {
      if (call === this.call) this.call = null;
      call.end();
      throw error;
    }
  }

  send(event: object): void {
    this.call?.send(event);
  }

  end(): void {
    this.call?.end();
    this.call = null;
  }
}
