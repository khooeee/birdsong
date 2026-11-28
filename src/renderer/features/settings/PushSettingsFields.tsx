import { SecretKeyPicker } from "./SecretKeyPicker";
import type { SettingsFieldsProps } from "./SettingsFieldsProps";

/** Turn alerts for the mobile apps: the APNs key for the iPhone and the Firebase key for Android. */
export function PushSettingsFields({ draft, busy, onChange }: SettingsFieldsProps) {
  return (
    <>
      <h3 className="settings-section">Alerts</h3>
      <div className="settings-note">
        Alerts a phone or tablet when a turn finishes and its app is in the background.
      </div>
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
      <SecretKeyPicker
        name="APNs Key"
        busy={busy}
        load={window.birdsong.getApnsKeyInfo}
        pick={window.birdsong.pickApnsKey}
        remove={window.birdsong.removeApnsKey}
      />
      <div className="settings-note">For the iPhone. Use the .p8 from the Apple developer portal.</div>
      <SecretKeyPicker
        name="FCM Service Account"
        busy={busy}
        load={window.birdsong.getFcmKeyInfo}
        pick={window.birdsong.pickFcmKey}
        remove={window.birdsong.removeFcmKey}
      />
      <div className="settings-note">
        For Android. In the Firebase console, open Project settings → Service accounts → Generate new private key.
      </div>
    </>
  );
}
