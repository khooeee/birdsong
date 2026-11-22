import { memo } from "react";
import type { InworldVoice } from "../../../shared/inworldVoice";
import { voiceTraits } from "./voiceTraits";

type Props = {
  id: string;
  index: number;
  voice: InworldVoice;
  active: boolean;
  chosen: boolean;
  onPick: (index: number) => void;
};

/** One voice in the picker: name and traits, then its description on one line (full text on hover). */
export const VoiceOptionRow = memo(function VoiceOptionRow({ id, index, voice, active, chosen, onPick }: Props) {
  return (
    <div
      id={id}
      role="option"
      className="voice-option"
      aria-selected={active}
      data-chosen={chosen || undefined}
      title={voice.description || undefined}
      // Keep focus in the search box.
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onPick(index)}
    >
      <div className="voice-option-head">
        <span className="voice-option-name">{voice.displayName}</span>
        <span className="voice-option-traits">{voiceTraits(voice)}</span>
      </div>
      {voice.description && <div className="voice-option-description">{voice.description}</div>}
    </div>
  );
});
