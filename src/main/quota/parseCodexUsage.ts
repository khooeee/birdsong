import { isRecord } from "../../shared/isRecord";
import { bindingWindow, windowLabel } from "./bindingWindow";
import type { QuotaReading } from "./QuotaReading";

function readWindow(window: unknown): QuotaReading | null {
  if (!isRecord(window) || typeof window.used_percent !== "number") return null;
  const seconds = typeof window.limit_window_seconds === "number" ? window.limit_window_seconds : 0;
  return {
    usedPercent: window.used_percent,
    // Epoch seconds.
    resetsAt: typeof window.reset_at === "number" ? window.reset_at * 1000 : null,
    window: windowLabel(seconds),
  };
}

/** Codex's binding window from `chatgpt.com/backend-api/wham/usage` (what the Codex CLI reads). */
export function parseCodexUsage(body: unknown): QuotaReading | null {
  if (!isRecord(body) || !isRecord(body.rate_limit)) return null;
  const { primary_window, secondary_window } = body.rate_limit;
  const windows = [readWindow(primary_window), readWindow(secondary_window)];
  return bindingWindow(windows.filter((window): window is QuotaReading => window !== null));
}
