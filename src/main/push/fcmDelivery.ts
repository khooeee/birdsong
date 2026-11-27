import { errorMessage } from "../../shared/errorMessage";
import { fcmAccessToken } from "./fcmAccessToken";
import { fcmKeyStore } from "./fcmKeyStore";
import { isDeadFcmToken } from "./isDeadFcmToken";
import type { PushDevice } from "./PushDevice";
import type { PushDelivery } from "./PushPayload";
import { sendFcmPush } from "./sendFcmPush";

/** Sends to the Android devices among `devices`; null when there are none or no FCM key is saved. */
export async function fcmDelivery(devices: PushDevice[], drop: (token: string) => Promise<void>): Promise<PushDelivery | null> {
  const tablets = devices.filter((device) => device.platform === "fcm");
  if (tablets.length === 0) return null;
  const account = await fcmKeyStore.read();
  if (!account) return null;
  return async ({ alert, sessionId, unreadIds }) => {
    let accessToken: string;
    try {
      accessToken = await fcmAccessToken(account);
    } catch (error) {
      console.warn(`[push] ${errorMessage(error)}`);
      return tablets.map(() => false);
    }
    return Promise.all(
      tablets.map(async ({ token }) => {
        try {
          const result = await sendFcmPush({ token, projectId: account.projectId, accessToken, alert, sessionId, unreadIds });
          if (isDeadFcmToken(result)) await drop(token);
          return result.status !== 429 && result.status < 500;
        } catch (error) {
          console.warn(`[push] ${errorMessage(error)}`);
          return false;
        }
      }),
    );
  };
}
