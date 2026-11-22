import { connect } from "node:http2";

type ApnsAlert = {
  token: string;
  sandbox: boolean;
  /** The phone's bundle id. The APNs key's team must be the team that signed that app. */
  topic: string;
  jwt: string;
  title: string;
  body: string;
  sessionId: string;
};

/** One alert to one device. Returns the APNs status (410 means the token is dead). */
export function sendApnsAlert(input: ApnsAlert): Promise<number> {
  const host = input.sandbox ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com";
  const client = connect(host);
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (result: { status: number } | { error: unknown }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      client.close();
      if ("error" in result) reject(result.error);
      else resolve(result.status);
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
        if (status !== 200) console.warn(`[push] APNs ${status} ${Buffer.concat(chunks).toString("utf8")}`);
        finish({ status });
      });
    });
    req.end(
      JSON.stringify({
        aps: { alert: { title: input.title, body: input.body }, sound: "default" },
        sessionId: input.sessionId,
      }),
    );
  });
}
