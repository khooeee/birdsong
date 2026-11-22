import { isRecord } from "../../shared/isRecord";
import { windowLabel } from "./bindingWindow";
import type { QuotaReading } from "./QuotaReading";

/** Connect JSON sends int64s as strings. */
function epochMs(value: unknown): number | null {
  const ms = Number(value);
  return Number.isFinite(ms) && ms > 0 ? ms : null;
}

/** Cursor's included usage from `DashboardService/GetCurrentPeriodUsage` (what `cursor-agent`'s `/usage` reads). */
export function parseCursorUsage(body: unknown): QuotaReading | null {
  if (!isRecord(body) || !isRecord(body.planUsage)) return null;
  const { totalPercentUsed } = body.planUsage;
  const start = epochMs(body.billingCycleStart);
  const end = epochMs(body.billingCycleEnd);
  return {
    // Proto3 JSON leaves out zeros.
    usedPercent: typeof totalPercentUsed === "number" ? totalPercentUsed : 0,
    resetsAt: end,
    window: start && end ? windowLabel((end - start) / 1000) : "monthly",
  };
}
