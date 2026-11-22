import type { AgentQuota } from "../../../shared/agentQuota";
import { AGENT_LABELS } from "../../../shared/agentLabels";

/** "Thu 5:00 PM", with the date once it is more than a week out. */
function formatReset(resetsAt: number): string {
  const date = new Date(resetsAt);
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (date.toDateString() === new Date().toDateString()) return `today ${time}`;
  const withinWeek = resetsAt - Date.now() < 6 * 86_400_000;
  const day = withinWeek
    ? date.toLocaleDateString(undefined, { weekday: "short" })
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${day} ${time}`;
}

/** One line per agent: "Codex: 85% of weekly · resets Sun 9:01 PM". */
export function quotaTooltip(quotas: AgentQuota[]): string {
  return quotas
    .map((quota) => {
      const reset = quota.resetsAt ? ` · resets ${formatReset(quota.resetsAt)}` : "";
      const error = quota.error ? `\n  ${quota.error}` : "";
      return `${AGENT_LABELS[quota.agent]}: ${Math.round(quota.usedPercent)}% of ${quota.window}${reset}${error}`;
    })
    .join("\n");
}
