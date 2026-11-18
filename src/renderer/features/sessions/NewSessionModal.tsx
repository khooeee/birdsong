import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { AgentKind } from "../../../shared/agentKind";
import { AGENT_LABELS } from "../../../shared/agentLabels";
import type { CreateSessionInput } from "../../../shared/createSessionInput";
import { errorMessage } from "../../../shared/errorMessage";
import { folderTitle } from "../../../shared/folderTitle";
import { generatesSessionTitles } from "../../../shared/generatesSessionTitles";
import { useModalKeyboard } from "../modals/useModalKeyboard";
import { getAppSettingsCache, patchAppSettings } from "../settings/appSettingsCache";
import { randomSessionTitle } from "./sessionTitle";
import { useAvailableAgents } from "./useAvailableAgents";
import { NewSessionConfigSelect } from "./NewSessionConfigSelect";
import { useNewSessionDraft } from "./useNewSessionDraft";
import "../modals/modal.css";
import "./newSessionModal.css";

const AGENT_KINDS = Object.keys(AGENT_LABELS) as AgentKind[];

interface Props {
  onCancel: () => void;
  onCreate: (input: CreateSessionInput) => Promise<void>;
}

export function NewSessionModal({ onCancel, onCreate }: Props) {
  const prefs = getAppSettingsCache();
  const [agent, setAgent] = useState<AgentKind>(prefs.lastAgent);
  const [cwd, setCwd] = useState(prefs.lastCwd);
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState(randomSessionTitle);
  const [pin, setPin] = useState(prefs.lastPin);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const available = useAvailableAgents();
  const agentOptions = AGENT_KINDS.filter((kind) => available === null || available.includes(kind));
  // Fall back when the remembered agent is no longer installed.
  const selectedAgent = agentOptions.includes(agent) ? agent : agentOptions[0];
  const draft = useNewSessionDraft(selectedAgent, cwd);
  // Agents that title themselves get the first prompt; the rest (pi) a title.
  const asksPrompt = generatesSessionTitles(selectedAgent);
  const canCreate = !!selectedAgent && !!cwd.trim() && (asksPrompt || !!title.trim()) && !busy && !draft.updating;

  useEffect(() => {
    const input = fieldRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, []);

  const create = async () => {
    if (!canCreate) return;
    const named = asksPrompt
      ? { prompt: prompt.trim() || undefined, autoTitle: true }
      : { title: folderTitle(cwd, title, selectedAgent) };
    setBusy(true);
    setError(null);
    void patchAppSettings({
      lastAgent: selectedAgent,
      lastCwd: cwd,
      lastPin: pin,
    });
    try {
      await onCreate({ agent: selectedAgent, cwd, pin, draftId: draft.id, ...named });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const createOnEnter = (event: ReactKeyboardEvent) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    void create();
  };

  useModalKeyboard(dialogRef, busy ? null : onCancel);

  return (
    <div
      className="modal-backdrop"
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <div ref={dialogRef} className="modal new-session-modal" onClick={(e) => e.stopPropagation()}>
        <h2>New agent session</h2>
        <label>
          Agent
          <select
            value={selectedAgent ?? ""}
            disabled={busy || !selectedAgent}
            onChange={(e) => setAgent(e.target.value as AgentKind)}
            onKeyDown={createOnEnter}
          >
            {agentOptions.map((kind) => (
              <option key={kind} value={kind}>
                {AGENT_LABELS[kind]}
              </option>
            ))}
            {!selectedAgent && <option value="">No ACP agents installed</option>}
          </select>
        </label>
        <div className="new-session-config">
          <NewSessionConfigSelect
            label="Model"
            config={draft.options.find((option) => option.category === "model")}
            loading={draft.loading}
            disabled={busy || draft.updating}
            onChange={(value) => void draft.select("model", value)}
          />
          <NewSessionConfigSelect
            label="Effort"
            config={draft.options.find((option) => option.category === "thought_level")}
            loading={draft.loading}
            disabled={busy || draft.updating}
            onChange={(value) => void draft.select("thought_level", value)}
          />
          {draft.error && <div className="new-session-config-error" role="status">{draft.error}</div>}
        </div>
        <label>
          Session Folder
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={cwd}
              disabled={busy}
              onChange={(e) => setCwd(e.target.value)}
              onKeyDown={createOnEnter}
              placeholder="/path/to/project"
              spellCheck={false}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={async () => {
                const picked = await window.birdsong.pickFolder(cwd);
                if (picked) setCwd(picked);
              }}
            >
              Browse
            </button>
          </div>
        </label>
        <label>
          {asksPrompt ? "Prompt" : "Title"}
          <textarea
            ref={fieldRef}
            className={asksPrompt ? "new-session-prompt" : undefined}
            value={asksPrompt ? prompt : title}
            rows={2}
            disabled={busy}
            onChange={(e) => (asksPrompt ? setPrompt : setTitle)(e.target.value)}
            onKeyDown={createOnEnter}
            placeholder={asksPrompt ? "Message the agent… (Enter to send, Shift+Enter for newline)" : undefined}
            spellCheck={false}
          />
        </label>
        <div className="modal-checks">
          <label className="modal-check">
            <input
              type="checkbox"
              checked={pin}
              disabled={busy}
              onChange={(e) => setPin(e.target.checked)}
              onKeyDown={createOnEnter}
            />
            Pin
          </label>
        </div>
        {error && <div style={{ color: "var(--danger)" }}>{error}</div>}
        <div className="composer-actions" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={!canCreate}
            onClick={() => void create()}
          >
            {busy ? "Starting…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
