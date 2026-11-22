import { isRecord } from "../../shared/isRecord";
import { bindingWindow, windowLabel } from "./bindingWindow";
import type { QuotaReading } from "./QuotaReading";

const DAY_S = 86_400;
/** Windows in `/api/oauth/usage`, with their length and a suffix for model-specific ones. */
const WINDOWS: [key: string, seconds: number, suffix: string][] = [
  ["five_hour", 5 * 3600, ""],
  ["seven_day", 7 * DAY_S, ""],
  ["seven_day_opus", 7 * DAY_S, " Opus"],
  ["seven_day_sonnet", 7 * DAY_S, " Sonnet"],
];

/** Claude's binding window from `api.anthropic.com/api/oauth/usage` (what Claude Code's `/usage` reads). */
export function parseClaudeUsage(body: unknown): QuotaReading | null {
  if (!isRecord(body)) return null;
  const windows: QuotaReading[] = [];
  for (const [key, seconds, suffix] of WINDOWS) {
    const window = body[key];
    if (!isRecord(window) || typeof window.utilization !== "number") continue;
    const resetsAt = typeof window.resets_at === "string" ? Date.parse(window.resets_at) : NaN;
    windows.push({
      usedPercent: window.utilization,
      resetsAt: Number.isFinite(resetsAt) ? resetsAt : null,
      window: windowLabel(seconds) + suffix,
    });
  }
  return bindingWindow(windows);
}
