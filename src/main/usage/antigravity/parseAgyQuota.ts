import type { UsageMeter } from "../../../shared/usageMeter";

/**
 * Meters from Antigravity's `/quota`, one tab-separated row per limit:
 * `Gemini Models	Weekly Limit Remaining	96%	2026-12-03T07:16:23Z`.
 * A reset at the epoch means the window has not started.
 */
export function parseAgyQuota(text: string): UsageMeter[] {
  const meters: UsageMeter[] = [];
  for (const line of text.split("\n")) {
    const [group, limit, remaining, reset] = line.split("\t").map((cell) => cell.trim());
    const percent = /^(\d+(?:\.\d+)?)%$/.exec(remaining ?? "");
    if (!group || !limit || !percent) continue;
    const resetsAt = Date.parse(reset ?? "");
    meters.push({
      label: `${group.replace(/\s+models$/i, "")} · ${limit.replace(/\s+(limit\s+)?remaining$/i, "")}`,
      usedPercent: Math.round((100 - Number(percent[1])) * 10) / 10,
      resetsAt: Number.isFinite(resetsAt) && resetsAt > 0 ? resetsAt : null,
    });
  }
  return meters;
}
