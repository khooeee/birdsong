import { useRef } from "react";
import { useModalKeyboard } from "../modals/useModalKeyboard";
import { AgentUsageCard } from "./AgentUsageCard";
import { useAgentUsage } from "./useAgentUsage";
import "../modals/modal.css";
import "./usage.css";

/** Usage and limits for every installed agent, read fresh each time it opens. */
export function UsageModal({ onClose }: { onClose: () => void }) {
  const { agents, usage, error, reading, refresh } = useAgentUsage();
  const dialogRef = useRef<HTMLDivElement>(null);
  const now = Date.now();
  useModalKeyboard(dialogRef, onClose, true);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div ref={dialogRef} className="modal usage-modal" role="dialog" aria-modal="true"
        aria-labelledby="usage-title" onClick={(event) => event.stopPropagation()}>
        <div className="usage-header">
          <h2 id="usage-title">Usage</h2>
          <div className="usage-actions">
            <button type="button" className="btn" disabled={reading} onClick={refresh}>
              {reading ? "Reading…" : "Refresh"}
            </button>
            <button autoFocus type="button" className="btn" onClick={onClose}>Close</button>
          </div>
        </div>
        <div className="usage-body">
          {error && <p className="usage-error" role="alert">{error}</p>}
          {agents?.length === 0 && <p className="usage-dim">No agents with usage are installed.</p>}
          <ul className="usage-list">
            {agents?.map(({ agent, name }) => (
              <AgentUsageCard key={agent} name={name} usage={usage[agent]} now={now} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
