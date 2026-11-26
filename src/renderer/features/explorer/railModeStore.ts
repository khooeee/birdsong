import type { RailMode } from "../../../shared/railMode";
import { patchAppSettings } from "../settings/appSettingsCache";

let mode: RailMode = "sessions";
let hasSessions = false;
const listeners = new Set<() => void>();

function apply(next: RailMode): boolean {
  if (next === mode) return false;
  mode = next;
  listeners.forEach((listener) => listener());
  return true;
}

/** One mode for the whole window, saved in settings. */
export const railModeStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot(): RailMode {
    return hasSessions ? mode : "sessions";
  },

  set(next: RailMode): void {
    if (next !== "sessions" && !hasSessions) return;
    if (apply(next)) void patchAppSettings({ railMode: next });
  },

  /** Called with each loaded session list; closing the last session also leaves Files mode. */
  setHasSessions(available: boolean): void {
    if (hasSessions === available && (available || mode === "sessions")) return;
    hasSessions = available;
    if (!available && mode !== "sessions") {
      mode = "sessions";
      void patchAppSettings({ railMode: "sessions" });
    }
    listeners.forEach((listener) => listener());
  },

  /** Take the saved mode at startup without writing it back. */
  restore(saved: unknown): void {
    // Keep the preference until the initial session list tells us whether Files is available.
    apply(saved === "files" || saved === "diff" ? saved : "sessions");
  },
};
