import type { VoiceStatus } from "../../../shared/voiceStatus";
import { voiceToggleLabel } from "../../../shared/voiceToggleLabel";

/** Mic tooltip: the toggle action, where voice is running, and any error on its own line. */
export function voiceTooltip({ state, error, peer }: VoiceStatus): string {
  if (state === "off") return error ? `Voice failed: ${error} Click to try again.` : voiceToggleLabel(state);
  const label = peer === "phone" ? `${voiceToggleLabel(state)} (on your iPhone)` : voiceToggleLabel(state);
  return error ? `${label}\nLast error: ${error}` : label;
}
