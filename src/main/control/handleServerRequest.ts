import type { IncomingMessage, ServerResponse } from "node:http";
import type { SessionManager } from "../sessions/SessionManager";
import type { RemoteEventHub } from "../remote/RemoteEventHub";
import type { VoiceAgent } from "../voice/VoiceAgent";
import type { PushDevices } from "../push/PushDevices";
import { handleMcpRequest } from "../mcp/handleMcpRequest";
import { handleDeviceRequest } from "../push/handleDeviceRequest";
import { handleIosInstallRequest } from "../ios/handleIosInstallRequest";
import { allowedHost } from "./allowedHost";
import { bearerAuthorized } from "./bearerAuthorized";
import { handleControlRequest } from "./controlRoutes";
import { requestAuthorized } from "./requestAuthorized";
import { sendJson } from "./sendJson";
import { viaTailscaleServe } from "./viaTailscaleServe";
import { handleVoiceRequest } from "./voiceRoutes";

type ServerContext = {
  /** control.json scripts' token; refused over Tailscale. */
  localToken: string;
  /** The iOS app's token. */
  remoteToken: string;
  baseUrl: string;
  sessions: SessionManager;
  hub: RemoteEventHub;
  voice: VoiceAgent;
  devices: PushDevices;
  remoteEnabled: () => boolean;
};

/**
 * Refuse unexpected Host headers, Tailscale Funnel (the public internet), and Tailscale traffic unless remote
 * access is on; MCP, event streams and the phone's voice routes here, everything else is the control API.
 */
export async function handleServerRequest(
  req: IncomingMessage,
  res: ServerResponse,
  { localToken, remoteToken, baseUrl, sessions, hub, voice, devices, remoteEnabled }: ServerContext,
): Promise<void> {
  if (!allowedHost(req.headers.host)) {
    return sendJson(res, 403, { error: "Unexpected Host header" });
  }
  // Serve sets this on Funnel traffic and strips any copy a client sends.
  if (req.headers["tailscale-funnel-request"]) {
    return sendJson(res, 403, { error: "Birdsong refuses Tailscale Funnel. Use tailscale serve, which keeps it on your tailnet." });
  }
  if (!remoteEnabled() && viaTailscaleServe(req)) {
    return sendJson(res, 403, { error: "Remote access is off. Tick Allow the mobile apps over Tailscale in Birdsong's Settings." });
  }
  const url = new URL(req.url ?? "/", baseUrl);
  const pathname = url.pathname.replace(/\/$/, "") || "/";
  const mcpMatch = /^\/mcp\/([^/]+)$/.exec(pathname);
  if (mcpMatch) return handleMcpRequest(req, res, decodeURIComponent(mcpMatch[1]!), sessions);
  // OTA install files: the unguessable per-job token is the auth, so Safari can fetch them.
  // Funnel refusal and the remoteEnabled gate above still apply.
  const iosMatch = req.method === "GET" ? /^\/ios\/([^/]+)\/([^/]+)$/.exec(pathname) : null;
  if (iosMatch) return handleIosInstallRequest(req, res, iosMatch[1]!, iosMatch[2]!);
  if (pathname === "/devices") {
    if (!bearerAuthorized(req.headers.authorization, remoteToken)) return sendJson(res, 401, { error: "Unauthorized" });
    return handleDeviceRequest(req, res, devices);
  }
  if (pathname === "/voice" || pathname.startsWith("/voice/")) {
    // The mobile token only: scripts and agents (with the local token) can't take the mic.
    if (!bearerAuthorized(req.headers.authorization, remoteToken)) return sendJson(res, 401, { error: "Unauthorized" });
    return handleVoiceRequest(req, res, pathname, voice);
  }
  const authorized = requestAuthorized(req, localToken, remoteToken);
  const streamMatch = req.method === "GET" ? /^\/(?:sessions\/([^/]+)\/(?:turns\/([^/]+)\/)?)?events$/.exec(pathname) : null;
  if (!streamMatch) return handleControlRequest(req, res, authorized, baseUrl, sessions);

  if (!authorized) return sendJson(res, 401, { error: "Unauthorized" });
  const sessionId = streamMatch[1] && decodeURIComponent(streamMatch[1]);
  if (!sessionId) return hub.openList(req, res);
  if (!sessions.getSession(sessionId)) return sendJson(res, 404, { error: "Session not found" });
  const turnId = streamMatch[2] && decodeURIComponent(streamMatch[2]);
  if (turnId) return hub.turnDetails.open(sessionId, turnId, req, res);
  return hub.openTranscript(sessionId, req, res);
}
