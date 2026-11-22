import { useEffect, useRef, useState } from "react";
import { ipcErrorMessage } from "../../../shared/ipcErrorMessage";
import { voiceSample } from "./voiceSample";

type Props = { voiceId: string; disabled: boolean; onError: (message: string | null) => void };

/**
 * Play Inworld's sample of the chosen voice (main caches it); click again to stop. Choosing another voice
 * or closing Settings stops it, and a sample still loading for a voice no longer chosen is not played.
 */
export function VoiceSampleButton({ voiceId, disabled, onError }: Props) {
  const [phase, setPhase] = useState<"idle" | "loading" | "playing">("idle");
  const request = useRef(0);

  useEffect(
    () => () => {
      request.current += 1;
      voiceSample.stop();
      setPhase("idle");
    },
    [voiceId],
  );

  const toggle = async () => {
    if (phase === "playing") return voiceSample.stop();
    const id = ++request.current;
    onError(null);
    setPhase("loading");
    try {
      const mp3 = await window.birdsong.getVoicePreview(voiceId);
      if (id !== request.current) return;
      await voiceSample.play(mp3, () => setPhase("idle"));
      setPhase("playing");
    } catch (error) {
      if (id !== request.current) return;
      setPhase("idle");
      onError(ipcErrorMessage(error));
    }
  };

  return (
    <button
      type="button"
      className="btn"
      disabled={disabled || phase === "loading" || !voiceId.trim()}
      onClick={() => void toggle()}
    >
      {phase === "loading" ? "Loading…" : phase === "playing" ? "Stop" : "Play Sample"}
    </button>
  );
}
