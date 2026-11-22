import { useSyncExternalStore } from "react";
import { quotaLevel } from "../../../shared/quotaLevel";
import { quotaStore } from "./quotaStore";
import { quotaTooltip } from "./quotaTooltip";
import "./quota.css";

/** One-letter tags, so three meters fit the narrowest rail. */
const SHORT = { claude: "C", codex: "X", cursor: "R" } as const;

/** Rail footer: a small bar per logged-in agent's quota; hover for windows and reset times. */
export function QuotaMeters() {
  const quotas = useSyncExternalStore(quotaStore.subscribe, quotaStore.getSnapshot);
  if (quotas.length === 0) return null;

  return (
    <div className="rail-quota" data-tooltip={quotaTooltip(quotas)} aria-label={quotaTooltip(quotas)}>
      {quotas.map((quota) => (
        <div
          key={quota.agent}
          className={`quota-meter quota-${quotaLevel(quota.usedPercent)}${quota.error ? " quota-stale" : ""}`}
        >
          <span>{SHORT[quota.agent]}</span>
          <span className="quota-bar">
            <span className="quota-fill" style={{ width: `${Math.min(100, Math.max(0, quota.usedPercent))}%` }} />
          </span>
        </div>
      ))}
    </div>
  );
}
