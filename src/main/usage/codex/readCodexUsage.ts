import type { UsageReading } from "../UsageReading";
import { parseCodexRateLimits } from "./parseCodexRateLimits";
import { requestCodexAppServer } from "./requestCodexAppServer";

/** Codex reports its ChatGPT plan limits through its own app server. */
export async function readCodexUsage(): Promise<UsageReading> {
  return parseCodexRateLimits(await requestCodexAppServer("account/rateLimits/read"));
}
