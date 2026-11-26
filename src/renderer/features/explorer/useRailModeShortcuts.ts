import { useEffect } from "react";
import { inFilesMode } from "./inFilesMode";
import { railModeStore } from "./railModeStore";
import { dialogOpen } from "../shortcuts/dialogOpen";
import { modKey } from "../shortcuts/modKey";
import { voiceLogView } from "../voiceLog/voiceLogView";

const selectSessions = () => railModeStore.set("sessions");
const selectFiles = () => railModeStore.set("files");
const selectDiff = () => {
  voiceLogView.close();
  railModeStore.set("diff");
};

/**
 * Cmd/Ctrl+Shift+S/E/D select Sessions/Files/Diff directly.
 * Going to the prompt switches back to Sessions and repeats the command once shown.
 */
export function useRailModeShortcuts(): void {
  useEffect(() => {
    const toggle = () => {
      if (dialogOpen()) return;
      railModeStore.set(inFilesMode() ? "sessions" : "files");
    };
    const backToSessions = (event: Event) => {
      if (dialogOpen()) return;
      if (railModeStore.getSnapshot() === "sessions") return;
      railModeStore.set("sessions");
      requestAnimationFrame(() => window.dispatchEvent(new CustomEvent(event.type)));
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.repeat || dialogOpen()) return;
      const select = modKey(event, "s", true) ? selectSessions
        : modKey(event, "e", true) ? selectFiles
        : modKey(event, "d", true) ? selectDiff : undefined;
      if (!select || document.querySelector('[role="menu"]')) return;
      event.preventDefault();
      event.stopPropagation();
      select();
    };
    window.addEventListener("birdsong:toggle-explorer", toggle);
    window.addEventListener("birdsong:focus-prompt", backToSessions);
    window.addEventListener("birdsong:select-sessions", selectSessions);
    window.addEventListener("birdsong:select-files", selectFiles);
    window.addEventListener("birdsong:select-diff", selectDiff);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("birdsong:toggle-explorer", toggle);
      window.removeEventListener("birdsong:focus-prompt", backToSessions);
      window.removeEventListener("birdsong:select-sessions", selectSessions);
      window.removeEventListener("birdsong:select-files", selectFiles);
      window.removeEventListener("birdsong:select-diff", selectDiff);
      window.removeEventListener("keydown", onKey, true);
    };
  }, []);
}
