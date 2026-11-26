import { useCallback, useEffect, useState } from "react";
import type { RemoteStatus } from "../../../shared/remoteStatus";
import { useCopiedFlash } from "../copy/useCopiedFlash";
import { CommandBox } from "./CommandBox";
import { patchAppSettings } from "./appSettingsCache";
import type { SettingsFieldsProps } from "./SettingsFieldsProps";

/**
 * iOS access: the checkbox applies at once (unlike the rest of the modal) so pairing needs no reopen;
 * the port (shared with every session's MCP server) applies on Save. Status refreshes on window focus,
 * e.g. after running `tailscale serve`.
 */
export function RemoteSettingsFields({ draft, busy, onChange }: SettingsFieldsProps) {
  const [status, setStatus] = useState<RemoteStatus | null>(null);
  const [applying, setApplying] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [linkCopied, copyLink] = useCopiedFlash();
  const [pasteHint, setPasteHint] = useState(false);
  const [apnsHasKey, setApnsHasKey] = useState(false);
  const [apnsBusy, setApnsBusy] = useState(false);
  const [apnsError, setApnsError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    void window.birdsong.getRemoteStatus().then(setStatus);
    void window.birdsong.getApnsKeyInfo().then((info) => setApnsHasKey(info.hasKey));
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [refresh]);

  const toggle = async (remoteEnabled: boolean) => {
    onChange({ remoteEnabled });
    setApplying(true);
    try {
      await patchAppSettings({ remoteEnabled });
    } finally {
      setApplying(false);
      refresh();
    }
  };

  const rotateToken = async () => {
    const ok = window.confirm(
      "Rotate the token? The iOS app will need the new link.",
    );
    if (!ok) return;
    setRotating(true);
    try {
      setStatus(await window.birdsong.rotateControlToken());
    } finally {
      setRotating(false);
    }
  };

  return (
    <>
      <h3 className="settings-section">Remote</h3>
      <label className="modal-check">
        <input
          type="checkbox"
          checked={draft.remoteEnabled}
          disabled={busy || applying}
          onChange={(e) => void toggle(e.target.checked)}
        />
        Allow the iOS app over Tailscale
      </label>
      {draft.remoteEnabled && (
        <div className="settings-note">
          Keeps this computer awake while it is plugged in and Birdsong is listening on the Control API port. Closing
          the lid still puts it to sleep.
        </div>
      )}
      {status?.serveCommand && !status.servedUrl && (
        <div className="settings-note">
          Run once in a terminal:
          <CommandBox command={status.serveCommand} />
        </div>
      )}
      {status?.servedUrl && status.unserveCommand && (
        <div className="settings-note">
          Served at {status.servedUrl}. To stop:
          <CommandBox command={status.unserveCommand} />
        </div>
      )}
      <label>
        Control API port
        <input
          type="number"
          min={1}
          max={65535}
          value={draft.controlPort}
          disabled={busy}
          onChange={(e) => onChange({ controlPort: e.target.value })}
        />
      </label>
      <label>
        Token
        <input type="text" readOnly value={status?.token ?? ""} onFocus={(e) => e.target.select()} />
      </label>
      <div className="settings-note">
        <button type="button" className="btn" disabled={busy || rotating} onClick={() => void rotateToken()}>
          {rotating ? "Rotating…" : "Rotate Token"}
        </button>
      </div>
      {status?.error && <div className="settings-warning">{status.error}</div>}
      {status?.link && (
        <div className="settings-note">
          <button
            type="button"
            className="btn"
            onClick={() => {
              copyLink(status.link!);
              setPasteHint(true);
            }}
          >
            {linkCopied ? "Copied" : "Copy iOS Link"}
          </button>
          {pasteHint && " Paste the link into the iOS app."}
        </div>
      )}
      <label>
        APNs key ID
        <input
          type="text"
          value={draft.apnsKeyId}
          disabled={busy}
          spellCheck={false}
          onChange={(e) => onChange({ apnsKeyId: e.target.value })}
        />
      </label>
      <label>
        APNs team ID
        <input
          type="text"
          value={draft.apnsTeamId}
          disabled={busy}
          spellCheck={false}
          onChange={(e) => onChange({ apnsTeamId: e.target.value })}
        />
      </label>
      <div className="settings-note">
        <button
          type="button"
          className="btn"
          disabled={busy || apnsBusy}
          onClick={() => {
            setApnsBusy(true);
            setApnsError(null);
            void window.birdsong
              .pickApnsKey()
              .then((info) => setApnsHasKey(info.hasKey))
              .catch((error) => setApnsError(error instanceof Error ? error.message : String(error)))
              .finally(() => setApnsBusy(false));
          }}
        >
          {apnsBusy ? "Saving…" : apnsHasKey ? "Change APNs Key" : "Choose APNs Key"}
        </button>
        {apnsHasKey ? " Saved in this app (encrypted)." : ""}
        {apnsHasKey && (
          <button
            type="button"
            className="btn"
            disabled={busy || apnsBusy}
            onClick={() => {
              setApnsBusy(true);
              setApnsError(null);
              void window.birdsong
                .removeApnsKey()
                .then((info) => setApnsHasKey(info.hasKey))
                .catch((error) => setApnsError(error instanceof Error ? error.message : String(error)))
                .finally(() => setApnsBusy(false));
            }}
          >
            Remove
          </button>
        )}
      </div>
      {apnsError && <div className="settings-warning">{apnsError}</div>}
      <div className="settings-note">
        Alerts the iPhone when a turn finishes and the app is in the background. Use the .p8 from the Apple developer portal.
      </div>
    </>
  );
}
