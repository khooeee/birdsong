import { readFile } from "node:fs/promises";
import { errorMessage } from "../../shared/errorMessage";
import { unreadCount } from "../../shared/unreadCount";
import { getAppSettings } from "../appSettings";
import type { SessionManager } from "../sessions/SessionManager";
import { apnsJwt } from "./apnsJwt";
import { apnsKeyStore } from "./apnsKeyStore";
import type { PushContent } from "./PushContent";
import { PushDevices } from "./PushDevices";
import { sendApnsPush } from "./sendApnsPush";

/** Waits before each resend of a badge that didn't get through; after the last, the next change sends. */
const RETRY_MS = [10_000, 60_000, 300_000];

/** Pushes to every registered phone, with the unread count for the app icon's badge. */
export class PushSender {
  readonly devices = new PushDevices();
  /** The newest badge pushed; null until the first, so a launch replaces the one the last run left. */
  lastBadge: number | null = null;
  private retry: NodeJS.Timeout | undefined;
  /** The newest push that carried a badge; an older one that fails late must not replace its retry. */
  private newestBadgePush = 0;

  constructor(private sessions: SessionManager) {}

  /** `compose` runs only once a phone can be reached; null sends nothing. */
  async send(compose: () => Promise<PushContent | null>, attempt = 0): Promise<void> {
    try {
      const { apnsKeyId, apnsTeamId, apnsKeyPath } = getAppSettings();
      if (!apnsKeyId || !apnsTeamId) return;
      const devices = await this.devices.list();
      if (devices.length === 0) return;
      const pem = (await apnsKeyStore.read()) ?? (apnsKeyPath ? await readFile(apnsKeyPath, "utf8") : null);
      if (!pem) return;
      const content = await compose();
      if (!content) return;
      const unread = unreadCount(this.sessions.list());
      // iOS drops the app's delivered alerts when a push takes the badge to 0, so an alert never carries it.
      const badge = content.alert && unread === 0 ? undefined : unread;
      const jwt = apnsJwt(pem, apnsKeyId, apnsTeamId);
      let badgePush: number | undefined;
      if (badge !== undefined) {
        this.lastBadge = badge;
        badgePush = ++this.newestBadgePush;
        // This push carries the current count, so an older one's retry has nothing left to fix.
        clearTimeout(this.retry);
      }
      const settled = await Promise.all(
        devices.map(async (device) => {
          try {
            const status = await sendApnsPush({ ...device, ...content, badge, jwt });
            if (status === 410) await this.devices.remove(device.token);
            return status !== 429 && status < 500;
          } catch (error) {
            console.warn(`[push] ${errorMessage(error)}`);
            return false;
          }
        }),
      );
      if (badgePush === this.newestBadgePush && settled.includes(false)) this.retryBadge(attempt);
    } catch (error) {
      console.warn(`[push] ${errorMessage(error)}`);
    }
  }

  /** Resends the badge alone; a phone that already has it is unaffected. */
  private retryBadge(attempt: number): void {
    const wait = RETRY_MS[attempt];
    if (wait === undefined) return;
    this.retry = setTimeout(() => void this.send(async () => ({}), attempt + 1), wait);
  }
}
