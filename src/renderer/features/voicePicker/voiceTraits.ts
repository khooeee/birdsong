import type { InworldVoice } from "../../../shared/inworldVoice";

/** "female · en-US · yours": what tells one voice from another besides its name. */
export function voiceTraits(voice: InworldVoice): string {
  return [voice.gender, voice.languageCode, voice.source === "SYSTEM" ? "" : "yours"].filter(Boolean).join(" · ");
}
