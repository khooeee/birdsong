import type { VoiceStatus } from "../../../shared/voiceStatus";

let status: VoiceStatus = { state: "off", activity: "idle", error: null, peer: "desktop", sessionId: null };
const listeners = new Set<() => void>();
let installed = false;

function set(next: VoiceStatus): void {
  status = next;
  listeners.forEach((listener) => listener());
}

/** Main's voice status for `useSyncExternalStore` (button, completion sound). */
export const voiceStatusStore = {
  subscribe(listener: () => void): () => void {
    if (!installed) {
      installed = true;
      window.birdsong.onVoiceStatus(set);
      void window.birdsong.getVoiceStatus().then(set);
    }
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot(): VoiceStatus {
    return status;
  },
};
