import { readFile } from "node:fs/promises";
import { agentTurns } from "../../shared/agentTurns";
import { errorMessage } from "../../shared/errorMessage";
import { getAppSettings } from "../appSettings";
import type { RemoteEventHub } from "../remote/RemoteEventHub";
import type { SessionManager } from "../sessions/SessionManager";
import { apnsKeyStore } from "./apnsKeyStore";
import { apnsJwt } from "./apnsJwt";
import { PushDevices } from "./PushDevices";
import { sendApnsAlert } from "./sendApnsAlert";
import { turnAlert } from "./turnAlert";

/** Sends an APNs alert when a prompt finishes and no phone is watching the event stream. */
export class TurnPush {
  readonly devices = new PushDevices();

  constructor(
    private sessions: SessionManager,
    private hub: RemoteEventHub,
  ) {
    sessions.subscribe((channel, payload) => {
      if (channel !== "prompt:complete") return;
      const sessionId = (payload as { sessionId?: unknown }).sessionId;
      if (typeof sessionId === "string") void this.notify(sessionId);
    });
  }

  private async notify(sessionId: string): Promise<void> {
    if (this.hub.hasListStream()) return;
    const { apnsKeyId, apnsTeamId, apnsKeyPath } = getAppSettings();
    if (!apnsKeyId || !apnsTeamId) return;
    const devices = await this.devices.list();
    if (devices.length === 0 || this.hub.hasListStream()) return;
    const session = this.sessions.getSession(sessionId);
    if (!session) return;
    try {
      const pem = (await apnsKeyStore.read()) ?? (apnsKeyPath ? await readFile(apnsKeyPath, "utf8") : null);
      if (!pem) return;
      const turns = await this.sessions.getTranscript(sessionId);
      if (this.hub.hasListStream()) return;
      const alert = turnAlert(session, agentTurns(turns).at(-1));
      const jwt = apnsJwt(pem, apnsKeyId, apnsTeamId);
      await Promise.all(
        devices.map(async (device) => {
          try {
            const status = await sendApnsAlert({
              ...alert,
              token: device.token,
              sandbox: device.sandbox,
              topic: device.topic,
              jwt,
              sessionId,
            });
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
