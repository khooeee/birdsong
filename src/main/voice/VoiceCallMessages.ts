import { clipText } from "../../shared/clipText";
import type { Session } from "../../shared/session";
import type { SessionManager } from "../sessions/SessionManager";
import { appendVoiceLog } from "./appendVoiceLog";
import type { CurrentVoiceCall } from "./CurrentVoiceCall";
import type { VoiceConversation } from "./VoiceConversation";
import { voiceInstructionsUpdate } from "./voiceInstructionsUpdate";
import { voiceNoticeText } from "./voiceNoticeText";
import { VoiceNotices } from "./VoiceNotices";
import { voiceOutputUpdate } from "./voiceOutputUpdate";
import { voiceUserMessage } from "./voiceUserMessage";

/** What main says into the live call besides its first config: notices, the replay after a reconnect, and switches. */
export class VoiceCallMessages {
  constructor(
    private readonly call: CurrentVoiceCall,
    private readonly conversation: VoiceConversation,
    private readonly sessions: SessionManager,
  ) {}

  /** Speak queued notices; the response they trigger may not change the session (runVoiceTool). */
  notice(text: string): void {
    this.conversation.trigger = "notice";
    this.conversation.responseStarted();
    this.call.send(voiceUserMessage(text));
    this.call.send({ type: "response.create" });
    appendVoiceLog("notice", { text: clipText(text, 2000) });
  }

  /** A new call after a drop hears what was said, so it picks up where the last one left off. */
  replayHistory(): void {
    const { history } = this.conversation;
    if (history.length) this.call.send(voiceUserMessage(`${VoiceNotices.HEADER} ${voiceNoticeText.reconnected(history)}`));
  }

  /** Settings changed the speaking voice: switch the live call now (desktop or phone); new calls read settings. */
  voiceChanged(): void {
    if (!this.call.current) return;
    const voice = this.sessions.getSettings().voiceName;
    this.call.send(voiceOutputUpdate(voice));
    appendVoiceLog("state", { voice });
  }

  /** The session was renamed: give the live call its new title. */
  renamed(session: Session): void {
    if (this.call.current) this.call.send(voiceInstructionsUpdate(this.sessions.getSettings(), session));
  }
}
