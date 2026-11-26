import { AGENT_KINDS, type AgentKind } from "../../../shared/agentKind";
import { AGENT_LABELS } from "../../../shared/agentLabels";
import { useAvailableAgents } from "../sessions/useAvailableAgents";
import { modLabel } from "../shortcuts/modLabel";
import type { SettingsFieldsProps } from "./SettingsFieldsProps";

/** Home folder and agent. A blank folder turns Home off. */
export function HomeSettingsFields({ draft, busy, onChange }: SettingsFieldsProps) {
  const available = useAvailableAgents();
  const options = AGENT_KINDS.filter((kind) =>
    available === null || available.includes(kind) || kind === draft.homeAgent);
  const selected = options.includes(draft.homeAgent) ? draft.homeAgent : options[0];

  return (
    <>
      <h3 className="settings-section">Home</h3>
      <label>
        Agent
        <select
          value={selected ?? ""}
          disabled={busy || !selected}
          onChange={(e) => onChange({ homeAgent: e.target.value as AgentKind })}
        >
          {options.map((kind) => (
            <option key={kind} value={kind}>{AGENT_LABELS[kind]}</option>
          ))}
          {!selected && <option value="">No ACP agents installed</option>}
        </select>
      </label>
      <label>
        Folder
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={draft.homeCwd}
            disabled={busy}
            placeholder="/path/to/folder"
            spellCheck={false}
            style={{ flex: 1 }}
            onChange={(e) => onChange({ homeCwd: e.target.value })}
          />
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={async () => {
              const picked = await window.birdsong.pickFolder(draft.homeCwd);
              if (picked) onChange({ homeCwd: picked });
            }}
          >
            Browse
          </button>
        </div>
      </label>
      <div className="settings-note">
        A session pinned above the others. {modLabel("1")} switches between Home and the session you were on, in whatever view you're in.
        {modLabel("2")} switches Home's file explorer with that session.
        Leave the folder blank to turn Home off. Birdsong does not create the folder.
      </div>
    </>
  );
}
