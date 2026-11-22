import { useState } from "react";
import { findVoice } from "./findVoice";
import { useInworldVoices } from "./useInworldVoices";
import { VoicePicker } from "./VoicePicker";
import { VoiceSampleButton } from "./VoiceSampleButton";
import { voiceTraits } from "./voiceTraits";
import "./voicePicker.css";

type Props = {
  value: string;
  /** A key is saved, so main can list voices and fetch samples. */
  hasKey: boolean;
  busy: boolean;
  onChange: (voiceId: string) => void;
};

/**
 * The agent's speaking voice: a searchable list of the Inworld workspace's voices with a sample button.
 * Without a key, or when the list fails to load, it falls back to typing a voice ID.
 */
export function VoiceNameField({ value, hasKey, busy, onChange }: Props) {
  const { voices, loading, error, refresh } = useInworldVoices(hasKey);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const chosen = findVoice(voices, value);
  const listed = voices.length > 0;

  let status: string | null = null;
  if (!hasKey) status = "Save your Inworld API key to choose from its voices.";
  else if (loading && !listed) status = "Loading voices…";
  else if (error) status = `Could not load voices: ${error}`;
  else if (listed && value.trim() && !chosen) status = `“${value}” is not one of your Inworld voices.`;

  return (
    <>
      <div className="voice-field">
        <span className="voice-field-label">Voice</span>
        <div className="voice-field-row">
          {listed ? (
            <VoicePicker voices={voices} value={value} disabled={busy} onChange={onChange} />
          ) : (
            <input
              value={value}
              disabled={busy}
              aria-label="Voice"
              placeholder="Voice ID, e.g. Sarah"
              spellCheck={false}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
          <VoiceSampleButton voiceId={chosen?.voiceId ?? value} disabled={busy || !hasKey} onError={setSampleError} />
        </div>
      </div>
      {chosen && (chosen.description || voiceTraits(chosen)) && (
        <div className="settings-note">{[voiceTraits(chosen), chosen.description].filter(Boolean).join(" — ")}</div>
      )}
      {status && <div className={error ? "settings-warning" : "settings-note"}>{status}</div>}
      {sampleError && <div className="settings-warning">{sampleError}</div>}
      <div className="settings-note">
        Saving switches the voice at once, even mid-call on the iPhone. Browse more at{" "}
        <a href="https://platform.inworld.ai/voice-library" target="_blank" rel="noopener noreferrer">
          platform.inworld.ai/voice-library
        </a>
        {hasKey && (
          <>
            {" "}
            <button type="button" className="link-button" disabled={busy || loading} onClick={refresh}>
              {loading && listed ? "Refreshing…" : "Refresh list"}
            </button>
          </>
        )}
      </div>
    </>
  );
}
