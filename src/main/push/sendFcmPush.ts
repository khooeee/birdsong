import type { PushContent } from "./PushContent";

type FcmPush = PushContent & {
  token: string;
  projectId: string;
  accessToken: string;
  /** Sessions still unread, so the tablet can clear alerts read elsewhere; absent when there are too many. */
  unreadIds?: string[];
};

/** What FCM said: the HTTP status and, on failure, its `errorCode` (e.g. UNREGISTERED). */
export type FcmResult = { status: number; errorCode?: string };

/**
 * One data message to one Android device. Data only, so the app draws the alert and can take it down later;
 * alerts go high priority to get through Doze, badge-only updates collapse into the newest.
 */
export async function sendFcmPush(input: FcmPush): Promise<FcmResult> {
  const { alert, sessionId, unreadIds } = input;
  const data: Record<string, string> = { kind: alert ? "turn" : "unread" };
  if (alert) {
    data.title = alert.title;
    data.body = alert.body;
  }
  if (sessionId) data.sessionId = sessionId;
  if (unreadIds) data.unreadIds = unreadIds.join(",");
  const android = alert ? { priority: "HIGH" } : { priority: "NORMAL", collapse_key: "unread" };
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(input.projectId)}/messages:send`, {
    method: "POST",
    headers: { authorization: `Bearer ${input.accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ message: { token: input.token, data, android } }),
    signal: AbortSignal.timeout(10_000),
  });
  if (response.ok) return { status: response.status };
  const body = await response.text();
  console.warn(`[push] FCM ${response.status} ${body}`);
  return { status: response.status, errorCode: fcmErrorCode(body) };
}

function fcmErrorCode(body: string): string | undefined {
  try {
    const details = (JSON.parse(body) as { error?: { details?: Array<{ errorCode?: unknown }> } }).error?.details;
    const code = details?.find((item) => typeof item.errorCode === "string")?.errorCode;
    return typeof code === "string" ? code : undefined;
  } catch {
    return undefined;
  }
}
