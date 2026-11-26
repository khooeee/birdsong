import type { ApnsResult } from "./sendApnsPush";

/** 400 reasons that blame the token itself, so resending can never succeed. */
const DEAD_REASONS = new Set(["BadDeviceToken", "DeviceTokenNotForTopic"]);

/**
 * True when APNs will never deliver to this token: 410 (unregistered), or a token left by an old install or
 * another build. The phone registers its current token on every launch, so dropping a dead one loses nothing.
 */
export function isDeadToken({ status, reason }: ApnsResult): boolean {
  return status === 410 || (status === 400 && reason !== undefined && DEAD_REASONS.has(reason));
}
