import type { UsageMeter } from "../../../shared/usageMeter";
import { formatReset } from "./formatReset";

/** One limit: label, a bar filled to the used share, the percent, then its reset or detail. */
export function UsageMeterRow({ meter, now }: { meter: UsageMeter; now: number }) {
  const { label, usedPercent, resetsAt, detail } = meter;
  const used = usedPercent === null ? null : Math.min(100, Math.max(0, usedPercent));
  const extra = [detail, formatReset(resetsAt, now)].filter(Boolean).join(" · ");

  return (
    <div className="usage-meter">
      <span className="usage-meter-label">{label}</span>
      {used === null ? (
        <span className="usage-meter-detail usage-meter-wide">{extra}</span>
      ) : (
        <>
          <span className={`usage-bar ${used >= 90 ? "high" : ""}`} role="meter" aria-label={label}
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={used}>
            <span className="usage-bar-fill" style={{ width: `${used}%` }} />
          </span>
          <span className="usage-meter-percent">{Math.round(used)}%</span>
          <span className="usage-meter-detail">{extra}</span>
        </>
      )}
    </div>
  );
}
