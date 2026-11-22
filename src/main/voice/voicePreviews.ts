import { fetchVoicePreview } from "./fetchVoicePreview";
import { voiceKeyStore } from "./voiceKeyStore";

/** Samples kept per launch; replaying one never asks Inworld again. */
const MAX_CACHED = 50;
const cache = new Map<string, Promise<Uint8Array>>();

async function load(voiceId: string): Promise<Uint8Array> {
  const key = await voiceKeyStore.read();
  if (!key) throw new Error("Save your Inworld API key to hear voice samples.");
  return fetchVoicePreview(key, voiceId);
}

/** MP3 samples of voices, cached because Inworld rate-limits previews; failures are not cached. */
export const voicePreviews = {
  get(voiceId: string): Promise<Uint8Array> {
    const id = voiceId.trim();
    if (!id) return Promise.reject(new Error("Choose a voice first."));
    let pending = cache.get(id);
    if (!pending) {
      const loading = load(id);
      pending = loading;
      cache.set(id, loading);
      loading.catch(() => {
        if (cache.get(id) === loading) cache.delete(id);
      });
      if (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value!);
    }
    return pending;
  },

  /** A new key may belong to another workspace, with other custom voices. */
  clear(): void {
    cache.clear();
  },
};
