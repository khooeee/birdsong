/** An APNs device token: lowercase hex. */
export const APNS_TOKEN = /^[0-9a-f]{32,200}$/;
/** An FCM registration token: case-sensitive, base64url plus `:`. */
export const FCM_TOKEN = /^[A-Za-z0-9_:-]{20,4096}$/;
/** A bundle id. */
export const APNS_TOPIC = /^[A-Za-z0-9][A-Za-z0-9.-]{1,200}$/;

/** A phone or tablet that asked to be alerted when a turn finishes: an iPhone over APNs, or an Android over FCM. */
export type PushDevice =
  | { platform: "apns"; token: string; sandbox: boolean; topic: string }
  | { platform: "fcm"; token: string };

/** One saved device, or null when it is malformed. Entries saved before Android have no platform and are APNs. */
export function parsePushDevice(item: unknown): PushDevice | null {
  if (!item || typeof item !== "object") return null;
  const { platform, token, sandbox, topic } = item as Record<string, unknown>;
  if (typeof token !== "string") return null;
  if (platform === "fcm") return FCM_TOKEN.test(token) ? { platform, token } : null;
  if (platform !== undefined && platform !== "apns") return null;
  if (!APNS_TOKEN.test(token) || typeof topic !== "string" || !APNS_TOPIC.test(topic)) return null;
  return { platform: "apns", token, sandbox: sandbox === true, topic };
}
