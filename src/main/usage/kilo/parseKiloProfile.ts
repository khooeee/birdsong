import { isRecord } from "../../../shared/isRecord";
import type { UsageReading } from "../UsageReading";

/**
 * Reads `kilo profile --json`: `{ name, email, team, organizationId, balance }`.
 * Kilo Gateway is prepaid, so the limit is a dollar balance rather than a percentage.
 */
export function parseKiloProfile(profile: unknown): UsageReading {
  if (!isRecord(profile)) throw new Error("Kilo returned no profile");
  const balance = Number(profile.balance);
  if (!Number.isFinite(balance)) throw new Error("Kilo returned no balance");
  return {
    plan: typeof profile.team === "string" ? profile.team : undefined,
    meters: [{ label: "Credits", usedPercent: null, resetsAt: null, detail: `$${balance.toFixed(2)} left` }],
  };
}
