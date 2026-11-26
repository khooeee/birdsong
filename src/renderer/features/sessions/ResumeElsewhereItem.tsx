import { useRef, useState } from "react";
import type { AgentKind } from "../../../shared/agentKind";
import { AGENT_LABELS } from "../../../shared/agentLabels";
import type { Session } from "../../../shared/session";
import { resumeElsewhere } from "./resumeElsewhere";
import { useAvailableAgents } from "./useAvailableAgents";

/** Continue with, and a flyout of the installed coding agents. */
export function ResumeElsewhereItem({
  session,
  pinned,
  onDismiss,
}: {
  session: Session;
  pinned: boolean;
  onDismiss: () => void;
}) {
  const available = useAvailableAgents();
  const agents = available ?? [];
  const disabled = !session.cwd.trim() || agents.length === 0;
  const rowRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [alignLeft, setAlignLeft] = useState(false);
  const [alignUp, setAlignUp] = useState(false);

  const show = () => {
    if (disabled) return;
    const rect = rowRef.current?.getBoundingClientRect();
    if (rect) {
      setAlignLeft(rect.right + 180 > window.innerWidth && rect.left > 180);
      setAlignUp(rect.top + 220 > window.innerHeight);
    }
    setOpen(true);
  };

  const choose = (agent: AgentKind) => {
    resumeElsewhere(session, agent, pinned);
    onDismiss();
  };

  return (
    <div
      ref={rowRef}
      className="context-submenu"
      onMouseEnter={show}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        role="menuitem"
        className="context-item"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : show())}
      >
        Continue with
        <span className="settings-shortcut" aria-hidden="true">›</span>
      </button>
      {open && !disabled && (
        <div
          className={`context-flyout${alignLeft ? " align-left" : ""}${alignUp ? " align-up" : ""}`}
          role="menu"
        >
          {agents.map((agent) => (
            <button
              key={agent}
              type="button"
              role="menuitem"
              className="context-item"
              onClick={() => choose(agent)}
            >
              {AGENT_LABELS[agent]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
