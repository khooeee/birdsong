import type { SessionListPayload } from "../../shared/birdsongApi";
import { unreadCount } from "../../shared/unreadCount";
import type { SessionManager } from "../sessions/SessionManager";
import type { PushSender } from "./PushSender";

/** Long enough for a finished turn's alert to carry the new count itself. */
const SETTLE_MS = 2000;

/**
 * Updates the iPhone icon's badge, and takes down Android alerts, when the unread count changes without an alert,
 * e.g. a session read on the Mac.
 * An open event stream doesn't stop it: a phone that just left the app can look connected for a while.
 */
export class BadgePush {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private sessions: SessionManager,
    private sender: PushSender,
  ) {
    sessions.subscribe((channel, payload) => {
      if (channel === "sessions:changed") this.queue(payload as SessionListPayload);
    });
  }

  private queue(list: SessionListPayload): void {
    if (this.timer || this.isCurrent(list)) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.sender.send(async () => (this.isCurrent(this.sessions.list()) ? null : {}));
    }, SETTLE_MS);
  }

  private isCurrent(list: SessionListPayload): boolean {
    return unreadCount(list) === this.sender.lastBadge;
  }
}
