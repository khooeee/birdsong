import type { IncomingMessage, ServerResponse } from "node:http";
import { errorMessage } from "../../shared/errorMessage";
import type { VoiceAgent } from "../voice/VoiceAgent";
import { readJson } from "./readJson";
import { sendJson } from "./sendJson";

/**
 * The iOS app's voice routes. The phone carries the call's audio straight to Inworld; this Mac keeps the key and
 * drives the call over its sideband, so the phone only calls here to start (on a session), open, resume and stop.
 */
export async function handleVoiceRequest(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  voice: VoiceAgent,
): Promise<void> {
  try {
    const method = (req.method ?? "GET").toUpperCase();
    if (method === "GET" && pathname === "/voice") return sendJson(res, 200, voice.getStatus());
    if (method !== "POST") return sendJson(res, 404, { error: "Not found" });

    if (pathname === "/voice/start") {
      const body = await readJson(req);
      const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
      if (!sessionId) return sendJson(res, 400, { error: "sessionId is required. Update the Birdsong app." });
      const reason = typeof body.reason === "string" ? body.reason : undefined;
      const iceServers = await voice.startPhone(sessionId, body.resume === true, reason);
      // 409: voice was stopped (on the Mac, by idle, or by the agent) or moved to another session, so don't resume.
      if (!iceServers) return sendJson(res, 409, { error: voice.getStatus().error ?? "Voice is off." });
      return sendJson(res, 200, { iceServers });
    }
    if (pathname === "/voice/answer") {
      const body = await readJson(req);
      const sdp = typeof body.sdp === "string" ? body.sdp : "";
      if (!sdp) return sendJson(res, 400, { error: "sdp is required" });
      return sendJson(res, 200, { sdp: await voice.answer(sdp, "phone") });
    }
    if (pathname === "/voice/open") {
      voice.open("phone");
      return sendJson(res, 200, { ok: true });
    }
    if (pathname === "/voice/stop") {
      voice.stopPhone();
      return sendJson(res, 200, { ok: true });
    }
    return sendJson(res, 404, { error: "Not found" });
  } catch (err) {
    return sendJson(res, 400, { error: errorMessage(err) });
  }
}
