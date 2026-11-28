import type { FcmResult } from "./sendFcmPush";

/**
 * True when FCM will never deliver to this token: the app was uninstalled or its token replaced, or it belongs to
 * another Firebase project. Only FCM's own error codes count; a bare 404 can also mean a wrong project ID.
 * The tablet registers its current token on every launch, so dropping it loses nothing.
 */
export function isDeadFcmToken({ errorCode }: FcmResult): boolean {
  return errorCode === "UNREGISTERED" || errorCode === "SENDER_ID_MISMATCH";
}
