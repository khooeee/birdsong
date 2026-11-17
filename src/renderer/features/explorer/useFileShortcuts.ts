import { useEffect } from "react";
import { goToFileOpen } from "../goToFile/goToFileOpen";
import { dialogOpen } from "../shortcuts/dialogOpen";
import { inFilesMode } from "./inFilesMode";
import { wordWrapPreference } from "../editor/wordWrapPreference";
import { fileShortcutCommand } from "./fileShortcutCommand";

/** Ctrl+Tab / Ctrl+Shift+Tab (no Cmd or Alt). */
function ctrlTab(event: KeyboardEvent): boolean {
  return event.key === "Tab" && event.ctrlKey && !event.metaKey && !event.altKey;
}

/**
 * In Files mode, Cmd+S saves, Cmd+F searches the file, Cmd+Shift+F searches working folders,
 * Cmd+W closes, Cmd+P opens Go to File, Cmd+O opens a file dialog, Cmd+N opens an untitled file, and
 * Ctrl+Tab / Ctrl+Shift+Tab step through the open files.
 * Capture phase, registered before the session shortcuts, so they never see these keys there.
 * While Go to File is open the keys are still taken (else Cmd+W would close the session), but only Cmd+P acts.
 */
export function useFileShortcuts(): void {
  useEffect(() => {
    // The native View menu owns Alt+Z; it is enabled only in Files mode.
    const onWordWrap = () => {
      if (!dialogOpen()) wordWrapPreference.toggle();
    };
    const onKey = (event: KeyboardEvent) => {
      if (!inFilesMode() || event.isComposing) return;
      const picking = goToFileOpen();
      if (dialogOpen() && !picking) return;
      if (ctrlTab(event)) {
        event.preventDefault();
        event.stopPropagation();
        if (picking) return;
        window.dispatchEvent(new CustomEvent(event.shiftKey ? "birdsong:prev-file" : "birdsong:next-file"));
        return;
      }
      const command = fileShortcutCommand(event);
      if (!command) return;
      event.preventDefault();
      event.stopPropagation();
      if (picking && command !== "birdsong:go-to-file") return;
      if (!event.repeat) window.dispatchEvent(new CustomEvent(command));
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("birdsong:toggle-word-wrap", onWordWrap);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("birdsong:toggle-word-wrap", onWordWrap);
    };
  }, []);
}
