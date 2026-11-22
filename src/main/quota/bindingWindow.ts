import type { QuotaReading } from "./QuotaReading";

const HOUR_S = 3600;

/** "5-hour", "weekly" or "monthly" for a window this many seconds long. */
export function windowLabel(seconds: number): string {
  if (seconds <= 6 * HOUR_S) return "5-hour";
  if (seconds <= 8 * 24 * HOUR_S) return "weekly";
  return "monthly";
}

/** The window that runs out first: the most used, then the one that resets last. */
export function bindingWindow(windows: QuotaReading[]): QuotaReading | null {
  let best: QuotaReading | null = null;
  for (const window of windows) {
    if (!Number.isFinite(window.usedPercent)) continue;
    if (
      !best ||
      window.usedPercent > best.usedPercent ||
      (window.usedPercent === best.usedPercent && (window.resetsAt ?? 0) > (best.resetsAt ?? 0))
    ) {
      best = window;
    }
  }
  return best;
}
