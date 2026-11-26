import { agentTurns } from "../../shared/agentTurns";
import type { RemoteEventHub } from "../remote/RemoteEventHub";
import type { SessionManager } from "../sessions/SessionManager";
import type { PushContent } from "./PushContent";
import type { PushSender } from "./PushSender";
import { turnAlert } from "./turnAlert";

/** Sends an APNs alert when a prompt finishes and no phone is watching the event stream. */
export class TurnPush {
  constructor(
    private sessions: SessionManager,
    private hub: RemoteEventHub,
    private sender: PushSender,
  ) {
    sessions.subscribe((channel, payload) => {
      if (channel !== "prompt:complete" || hub.hasListStream()) return;
      const sessionId = (payload as { sessionId?: unknown }).sessionId;
      if (typeof sessionId === "string") void this.sender.send(() => this.compose(sessionId));
    });
  }

  private async compose(sessionId: string): Promise<PushContent | null> {
    const session = this.sessions.getSession(sessionId);
    if (!session || this.hub.hasListStream()) return null;
    const turns = await this.sessions.getTranscript(sessionId);
    if (this.hub.hasListStream()) return null;
    return { alert: turnAlert(session, agentTurns(turns).at(-1)), sessionId };
  }
}
