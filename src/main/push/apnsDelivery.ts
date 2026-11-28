import { readFile } from "node:fs/promises";
import { errorMessage } from "../../shared/errorMessage";
import { getAppSettings } from "../appSettings";
import { apnsJwt } from "./apnsJwt";
import { apnsKeyStore } from "./apnsKeyStore";
import { isDeadToken } from "./isDeadToken";
import type { PushDevice } from "./PushDevice";
import type { PushDelivery } from "./PushPayload";
import { sendApnsPush } from "./sendApnsPush";

/** Sends to the iPhones among `devices`; null when there are none or APNs isn't set up. */
export async function apnsDelivery(devices: PushDevice[], drop: (token: string) => Promise<void>): Promise<PushDelivery | null> {
  const phones = devices.flatMap((device) => (device.platform === "apns" ? [device] : []));
  const { apnsKeyId, apnsTeamId, apnsKeyPath } = getAppSettings();
  if (phones.length === 0 || !apnsKeyId || !apnsTeamId) return null;
  const pem = (await apnsKeyStore.read()) ?? (apnsKeyPath ? await readFile(apnsKeyPath, "utf8") : null);
  if (!pem) return null;
  return async ({ alert, sessionId, badge }) => {
    const jwt = apnsJwt(pem, apnsKeyId, apnsTeamId);
    return Promise.all(
      phones.map(async (device) => {
        try {
          const result = await sendApnsPush({ ...device, alert, sessionId, badge, jwt });
          if (isDeadToken(result)) await drop(device.token);
          return result.status !== 429 && result.status < 500;
        } catch (error) {
          console.warn(`[push] ${errorMessage(error)}`);
          return false;
        }
      }),
    );
  };
}
