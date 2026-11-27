import { errorMessage } from "../../shared/errorMessage";
import { unreadCount } from "../../shared/unreadCount";
import type { SessionManager } from "../sessions/SessionManager";
import { apnsDelivery } from "./apnsDelivery";
import { fcmDelivery } from "./fcmDelivery";
import type { PushContent } from "./PushContent";
import { PushDevices } from "./PushDevices";
import type { PushDelivery } from "./PushPayload";

/** Waits before each resend of a badge that didn't get through; after the last, the next change sends. */
const RETRY_MS = [10_000, 60_000, 300_000];
/** FCM data must stay under 4 KB; past this many unread sessions, Android keeps its alerts. */
const MAX_UNREAD_IDS = 40;

/** Pushes to every registered phone and tablet, with the unread state for badges and clearing alerts. */
export class PushSender {
  readonly devices = new PushDevices();
  /** The newest badge pushed; null until the first, so a launch replaces the one the last run left. */
  lastBadge: number | null = null;
  private retry: NodeJS.Timeout | undefined;
  /** The newest push that carried a badge; an older one that fails late must not replace its retry. */
  private newestBadgePush = 0;

  constructor(private sessions: SessionManager) {}

  /** `compose` runs only once a device can be reached; null sends nothing. */
  async send(compose: () => Promise<PushContent | null>, attempt = 0): Promise<void> {
    try {
      const devices = await this.devices.list();
      const drop = (token: string) => this.devices.remove(token);
      const deliveries = (await Promise.all([apnsDelivery(devices, drop), fcmDelivery(devices, drop)])).filter(
        (delivery): delivery is PushDelivery => delivery !== null,
      );
      if (deliveries.length === 0) return;
      const content = await compose();
      if (!content) return;
      const list = this.sessions.list();
      const unread = unreadCount(list);
      const ids = [...list.pinned, ...list.unpinned].filter((session) => session.unread).map((session) => session.id);
      // iOS drops the app's delivered alerts when a push takes the badge to 0, so an alert never carries it.
      const badge = content.alert && unread === 0 ? undefined : unread;
      let badgePush: number | undefined;
      if (badge !== undefined) {
        this.lastBadge = badge;
        badgePush = ++this.newestBadgePush;
        // This push carries the current count, so an older one's retry has nothing left to fix.
        clearTimeout(this.retry);
      }
      const payload = { ...content, badge, unreadIds: ids.length <= MAX_UNREAD_IDS ? ids : undefined };
      const settled = (await Promise.all(deliveries.map((deliver) => deliver(payload)))).flat();
      if (badgePush === this.newestBadgePush && settled.includes(false)) this.retryBadge(attempt);
    } catch (error) {
      console.warn(`[push] ${errorMessage(error)}`);
    }
  }

  /** Resends the badge alone; a device that already has it is unaffected. */
  private retryBadge(attempt: number): void {
    const wait = RETRY_MS[attempt];
    if (wait === undefined) return;
    this.retry = setTimeout(() => void this.send(async () => ({}), attempt + 1), wait);
  }
}
