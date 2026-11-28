import type { IncomingMessage } from "node:http";
import { bearerAuthorized } from "./bearerAuthorized";
import { viaTailscaleServe } from "./viaTailscaleServe";

/**
 * Tailscale traffic must carry the mobile token, so the local token (in control.json, and often in agent
 * transcripts) is useless off this Mac. Local requests take either: the iOS simulator and Android emulator pair
 * with the pairing link.
 */
export function requestAuthorized(req: IncomingMessage, localToken: string, remoteToken: string): boolean {
  const header = req.headers.authorization;
  if (bearerAuthorized(header, remoteToken)) return true;
  return !viaTailscaleServe(req) && bearerAuthorized(header, localToken);
}
