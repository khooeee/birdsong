import { useSyncExternalStore } from "react";
import { voiceToggleLabel } from "../../../shared/voiceToggleLabel";
import { OPEN_SETTINGS_EVENT } from "../settings/openSettingsEvent";
import { MicIcon } from "./MicIcon";
import { voiceKeyPresence } from "./voiceKeyPresence";
import { voiceStatusStore } from "./voiceStatusStore";
import { voiceTooltip } from "./voiceTooltip";
import "./voice.css";

const OFF = { state: "off", activity: "idle", error: null, peer: "desktop", sessionId: null } as const;

/**
 * Session header mic (hidden without a key): starts voice on this session (moving it from any other), shows its
 * state while voice is here, and stops it; right-click opens Settings.
 */
export function VoiceButton({ sessionId }: { sessionId: string }) {
  const live = useSyncExternalStore(voiceStatusStore.subscribe, voiceStatusStore.getSnapshot);
  const hasKey = useSyncExternalStore(voiceKeyPresence.subscribe, voiceKeyPresence.getSnapshot);
  if (!hasKey) return null;
  // Another session's voice (or its last error) shows as off here.
  const status = live.sessionId === sessionId ? live : OFF;

  return (
    <button
      type="button"
      className={`event-action voice-button voice-${status.state} voice-${status.activity}`}
      data-tooltip={voiceTooltip(status)}
      data-tooltip-align="center"
      aria-label={voiceToggleLabel(status.state)}
      aria-pressed={status.state === "listening"}
      onClick={() => void window.birdsong.toggleVoice(sessionId)}
      onContextMenu={(event) => {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT));
      }}
    >
      <MicIcon />
      {status.error && status.state === "off" && <span className="voice-error-dot" aria-hidden="true" />}
    </button>
  );
}
