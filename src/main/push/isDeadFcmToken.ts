import type { FcmResult } from "./sendFcmPush";

/**
 * True when FCM will never deliver to this token: the app was uninstalled or its token replaced, or it belongs to
 * another Firebase project. The tablet registers its current token on every launch, so dropping it loses nothing.
 */
export function isDeadFcmToken({ status, errorCode }: FcmResult): boolean {
  return status === 404 || errorCode === "UNREGISTERED" || errorCode === "SENDER_ID_MISMATCH";
}
