import type { InworldVoice } from "../../shared/inworldVoice";
import { listInworldVoices } from "./listInworldVoices";
import { voiceKeyStore } from "./voiceKeyStore";

let cached: Promise<InworldVoice[]> | null = null;

async function load(): Promise<InworldVoice[]> {
  const key = await voiceKeyStore.read();
  if (!key) throw new Error("Save your Inworld API key to choose from its voices.");
  return listInworldVoices(key);
}

/** The Settings voice picker's list, fetched once per launch and key; a failed fetch is tried again next time. */
export const voiceCatalog = {
  list(refresh = false): Promise<InworldVoice[]> {
    if (!cached || refresh) {
      const pending = load();
      cached = pending;
      pending.catch(() => {
        if (cached === pending) cached = null;
      });
    }
    return cached;
  },

  /** The key changed, so the workspace's voices may have too. */
  clear(): void {
    cached = null;
  },
};
