import type { AgentUsage } from "../../../shared/agentUsage";
import { UsageMeterRow } from "./UsageMeterRow";

/** One agent in the Usage window: its limits, notes and errors, or a link to its usage page. */
export function AgentUsageCard({ name, usage, now }: { name: string; usage: AgentUsage | undefined; now: number }) {
  return (
    <li className="usage-agent">
      <div className="usage-agent-header">
        <h3>{name}</h3>
        {usage?.plan && <span className="usage-plan">{usage.plan}</span>}
      </div>
      {!usage ? <p className="usage-dim">Reading…</p> : (
        <>
          {usage.error && <p className="usage-error" role="alert">{usage.error}</p>}
          {usage.meters.length > 0 && (
            <div className="usage-meters">
              {usage.meters.map((meter) => <UsageMeterRow key={meter.label} meter={meter} now={now} />)}
            </div>
          )}
          {usage.notes.map((note) => <p key={note} className="usage-dim">{note}</p>)}
          {usage.page && (
            <>
              <p>
                <a href={usage.page.url} target="_blank" rel="noopener noreferrer">
                  {usage.page.url.replace(/^https?:\/\//, "")}
                </a>
              </p>
              {usage.page.hint && <p className="usage-dim">{usage.page.hint}</p>}
            </>
          )}
        </>
      )}
    </li>
  );
}
