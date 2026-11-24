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

/** Pushes to every registered phone, with the unread count for the app icon's badge. */
export class PushSender {
  readonly devices = new PushDevices();
  /** The newest badge pushed; null until the first, so a launch replaces the one the last run left. */
  lastBadge: number | null = null;

  constructor(private sessions: SessionManager) {}

  /** `compose` runs only once a phone can be reached; null sends nothing. */
  async send(compose: () => Promise<PushContent | null>): Promise<void> {
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
      if (badge !== undefined) this.lastBadge = badge;
      await Promise.all(
        devices.map(async (device) => {
          try {
            const status = await sendApnsPush({ ...device, ...content, badge, jwt });
            if (status === 410) await this.devices.remove(device.token);
          } catch (error) {
            console.warn(`[push] ${errorMessage(error)}`);
          }
        }),
      );
    } catch (error) {
      console.warn(`[push] ${errorMessage(error)}`);
    }
  }
}
