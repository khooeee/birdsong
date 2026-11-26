import { connect } from "node:http2";
import type { PushContent } from "./PushContent";

type ApnsPush = PushContent & {
  token: string;
  sandbox: boolean;
  /** The phone's bundle id. The APNs key's team must be the team that signed that app. */
  topic: string;
  jwt: string;
  /** The app icon's count; 0 clears it, absent leaves it. */
  badge?: number;
};

/** What APNs said: the HTTP status and, on failure, its `reason` (e.g. BadDeviceToken). */
export type ApnsResult = { status: number; reason?: string };

/** One push to one device. */
export function sendApnsPush(input: ApnsPush): Promise<ApnsResult> {
  const host = input.sandbox ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com";
  const client = connect(host);
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (result: ApnsResult | { error: unknown }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      client.close();
      if ("error" in result) reject(result.error);
      else resolve(result);
    };
    const timer = setTimeout(() => finish({ error: new Error("APNs timed out") }), 10_000);
    client.on("error", (error) => finish({ error }));
    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${input.token}`,
      authorization: `bearer ${input.jwt}`,
      "apns-topic": input.topic,
      "apns-push-type": "alert",
      "apns-priority": "10",
    });
    const chunks: Buffer[] = [];
    req.on("error", (error) => finish({ error }));
    req.on("response", (headers) => {
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => {
        const status = Number(headers[":status"] ?? 0);
        if (status === 200) return finish({ status });
        const body = Buffer.concat(chunks).toString("utf8");
        console.warn(`[push] APNs ${status} ${body}`);
        finish({ status, reason: apnsReason(body) });
      });
    });
    const { alert, badge, sessionId } = input;
    req.end(JSON.stringify({ aps: { badge, ...(alert && { alert, sound: "default" }) }, sessionId }));
  });
}

function apnsReason(body: string): string | undefined {
  try {
    const reason = (JSON.parse(body) as { reason?: unknown }).reason;
    return typeof reason === "string" ? reason : undefined;
  } catch {
    return undefined;
  }
}
