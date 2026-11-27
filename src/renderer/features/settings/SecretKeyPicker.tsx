import { useEffect, useState } from "react";
import type { SecretKeyInfo } from "../../../shared/secretKeyInfo";

type SecretKeyPickerProps = {
  /** e.g. "APNs Key"; the button reads "Choose APNs Key" or "Change APNs Key". */
  name: string;
  busy: boolean;
  load: () => Promise<SecretKeyInfo>;
  pick: () => Promise<SecretKeyInfo>;
  remove: () => Promise<SecretKeyInfo>;
};

/** Choose, change or remove a key file that main imports and encrypts; the key itself never reaches here. */
export function SecretKeyPicker({ name, busy, load, pick, remove }: SecretKeyPickerProps) {
  const [hasKey, setHasKey] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load().then((info) => setHasKey(info.hasKey));
  }, [load]);

  const run = (action: () => Promise<SecretKeyInfo>) => {
    setWorking(true);
    setError(null);
    void action()
      .then((info) => setHasKey(info.hasKey))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setWorking(false));
  };

  return (
    <>
      <div className="settings-note">
        <button type="button" className="btn" disabled={busy || working} onClick={() => run(pick)}>
          {working ? "Saving…" : hasKey ? `Change ${name}` : `Choose ${name}`}
        </button>
        {hasKey ? " Saved in this app (encrypted)." : ""}
        {hasKey && (
          <button type="button" className="btn" disabled={busy || working} onClick={() => run(remove)}>
            Remove
          </button>
        )}
      </div>
      {error && <div className="settings-warning">{error}</div>}
    </>
  );
}
