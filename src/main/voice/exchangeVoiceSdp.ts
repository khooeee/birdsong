import { inworldRequest } from "./inworldRequest";

/** Create the realtime call: post the peer's SDP offer; returns Inworld's answer and the call id (for the sideband). */
export async function exchangeVoiceSdp(key: string, offer: string): Promise<{ answer: string; callId: string }> {
  const res = await inworldRequest(key, "/v1/realtime/calls", {
    method: "POST",
    contentType: "application/sdp",
    body: offer,
    signal: AbortSignal.timeout(20_000),
  });
  // `Location: /v1/realtime/calls/{call_id}`
  const callId = res.headers.get("location")?.split("/").pop();
  if (!callId) throw new Error("Inworld did not return a call id.");
  return { answer: await res.text(), callId };
}
