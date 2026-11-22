import { isRecord } from "../../shared/isRecord";
import { inworldRequest } from "./inworldRequest";
import { VOICE_TTS_MODEL } from "./voiceTtsModel";

/** Inworld's short MP3 sample of `voiceId` (its own text). Free, but rate-limited harder than synthesis. */
export async function fetchVoicePreview(key: string, voiceId: string): Promise<Uint8Array> {
  const params = new URLSearchParams({ voice_id: voiceId, model_id: VOICE_TTS_MODEL });
  const res = await inworldRequest(key, `/tts/v1/voice:preview?${params}`, { signal: AbortSignal.timeout(20_000) });
  const body = (await res.json()) as unknown;
  const audio = isRecord(body) && typeof body.audioContent === "string" ? body.audioContent : "";
  if (!audio) throw new Error("Inworld returned no sample for this voice.");
  return new Uint8Array(Buffer.from(audio, "base64"));
}
