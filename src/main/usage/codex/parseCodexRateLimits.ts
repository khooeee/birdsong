import { isRecord } from "../../../shared/isRecord";
import type { UsageMeter } from "../../../shared/usageMeter";
import type { UsageReading } from "../UsageReading";
import { titleCase } from "./titleCase";
import { windowLabel } from "./windowLabel";

function limitMeters(limit: Record<string, unknown>): UsageMeter[] {
  const prefix = typeof limit.limitName === "string" && limit.limitName ? `${limit.limitName} ` : "";
  return [limit.primary, limit.secondary].filter(isRecord).map((window) => ({
    label: prefix + (typeof window.windowDurationMins === "number" ? windowLabel(window.windowDurationMins) : "Limit"),
    usedPercent: typeof window.usedPercent === "number" ? window.usedPercent : null,
    resetsAt: typeof window.resetsAt === "number" ? window.resetsAt * 1000 : null,
  }));
}

/** Reads the result of Codex's `account/rateLimits/read`. */
export function parseCodexRateLimits(result: unknown): UsageReading {
  if (!isRecord(result)) throw new Error("Codex returned no rate limits");
  const byId = isRecord(result.rateLimitsByLimitId) ? Object.values(result.rateLimitsByLimitId) : [result.rateLimits];
  const limits = byId.filter(isRecord);
  const notes: string[] = [];
  const credits = limits[0]?.credits;
  if (isRecord(credits) && credits.hasCredits) {
    notes.push(credits.unlimited ? "Credits: unlimited" : `Credits: ${String(credits.balance)}`);
  }
  const resets = isRecord(result.rateLimitResetCredits) ? result.rateLimitResetCredits.availableCount : 0;
  if (typeof resets === "number" && resets > 0) notes.push(`${resets} free limit reset${resets === 1 ? "" : "s"} available`);
  const planType = limits[0]?.planType;
  return { plan: typeof planType === "string" ? titleCase(planType) : undefined, meters: limits.flatMap(limitMeters), notes };
}
