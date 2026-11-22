import { VOICE_TTS_MODEL } from "./voiceTtsModel";

/** Partial `session.update` that switches a live call's speaking voice and leaves the rest of the session alone. */
export function voiceOutputUpdate(voice: string) {
  return { type: "session.update", session: { type: "realtime", audio: { output: { model: VOICE_TTS_MODEL, voice } } } };
}
