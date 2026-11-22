import type { InworldVoice } from "../../../shared/inworldVoice";

/** The voice `text` names: its id exactly, else its id or display name ignoring case. */
export function findVoice(voices: InworldVoice[], text: string): InworldVoice | undefined {
  const value = text.trim();
  if (!value) return undefined;
  const lower = value.toLowerCase();
  return (
    voices.find((voice) => voice.voiceId === value) ??
    voices.find((voice) => voice.voiceId.toLowerCase() === lower || voice.displayName.toLowerCase() === lower)
  );
}
