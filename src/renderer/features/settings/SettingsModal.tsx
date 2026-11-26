import { useRef, useState } from "react";
import { ipcErrorMessage } from "../../../shared/ipcErrorMessage";
import { useModalKeyboard } from "../modals/useModalKeyboard";
import { applyStoredTheme } from "../theme/theme";
import { McpSettingsFields } from "../mcp/McpSettingsFields";
import { VoiceSettingsFields } from "../voice/VoiceSettingsFields";
import { voiceKeyPresence } from "../voice/voiceKeyPresence";
import { getAppSettingsCache, patchAppSettings } from "./appSettingsCache";
import { draftFromSettings } from "./draftFromSettings";
import { GeneralSettingsFields } from "./GeneralSettingsFields";
import { HomeSettingsFields } from "./HomeSettingsFields";
import { patchFromDraft } from "./patchFromDraft";
import { RemoteSettingsFields } from "./RemoteSettingsFields";
import type { SettingsDraft } from "./SettingsDraft";
import "../modals/modal.css";
import "./settingsModal.css";

/** General, MCP, voice and remote settings; nothing saves until Save except the remote access checkbox. */
export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [draft, setDraft] = useState(() => draftFromSettings(getAppSettingsCache()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onChange = (patch: Partial<SettingsDraft>) => setDraft((prev) => ({ ...prev, ...patch }));

  useModalKeyboard(dialogRef, busy ? null : onClose);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      // First, since invalid text keeps the modal open.
      if (draft.mcpServers !== null) await window.birdsong.saveMcpServers(draft.mcpServers);
      if (draft.voiceKey !== null) {
        await window.birdsong.setVoiceKey(draft.voiceKey);
        voiceKeyPresence.refresh();
      }
      const prefs = getAppSettingsCache();
      const patch = patchFromDraft(draft, prefs);
      if (patch.homeCwd !== prefs.homeCwd || patch.homeAgent !== prefs.homeAgent) {
        const check = await window.birdsong.checkHomeChange(patch.homeCwd ?? "", patch.homeAgent ?? prefs.homeAgent);
        if (!check.ok) {
          if (check.error) setError(check.error);
          setBusy(false);
          return;
        }
        patch.homeCwd = check.cwd;
      }
      await patchAppSettings(patch);
      applyStoredTheme();
      onClose();
    } catch (err) {
      setError(ipcErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <div ref={dialogRef} className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>
        <div className="settings-body">
          <GeneralSettingsFields draft={draft} busy={busy} onChange={onChange} />
          <HomeSettingsFields draft={draft} busy={busy} onChange={onChange} />
          <McpSettingsFields draft={draft} busy={busy} onChange={onChange} />
          <VoiceSettingsFields draft={draft} busy={busy} onChange={onChange} />
          <RemoteSettingsFields draft={draft} busy={busy} onChange={onChange} />
        </div>
        {error && <div style={{ color: "var(--danger)" }}>{error}</div>}
        <div className="composer-actions" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn primary" disabled={busy} onClick={() => void save()}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
