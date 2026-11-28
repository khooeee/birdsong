import type { UsageMeter } from "../../../shared/usageMeter";
import { parseZonedReset } from "./parseZonedReset";

const LINE = /^(.+?):\s*(\d+(?:\.\d+)?)%\s+used(?:\s*·\s*resets\s+(.+))?$/;

/** Meters from the text of Claude Code's `/usage`, e.g. "Current session: 12% used · resets 3pm (UTC)". */
export function parseClaudeUsage(text: string, now = Date.now()): UsageMeter[] {
  const meters: UsageMeter[] = [];
  for (const raw of text.split("\n")) {
    const match = LINE.exec(raw.trim());
    if (!match) continue;
    const [, label = "", used, reset] = match;
    const resetsAt = reset ? parseZonedReset(reset, now) : null;
    meters.push({
      label: label.replace(/^Current\s+/i, "").replace(/^./, (c) => c.toUpperCase()),
      usedPercent: Number(used),
      resetsAt,
      ...(reset && resetsAt === null ? { detail: `resets ${reset}` } : {}),
    });
  }
  return meters;
}
