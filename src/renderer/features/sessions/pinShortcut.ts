import { isMac } from "../shortcuts/isMac";

/** Ctrl+Cmd+P on macOS, Ctrl+Alt+P elsewhere. */
export const pinShortcut = {
  label: isMac ? "⌃⌘P" : "Ctrl+Alt+P",
  keys: isMac ? "Control+Meta+P" : "Control+Alt+P",
  matches(event: KeyboardEvent): boolean {
    if (!event.ctrlKey || event.shiftKey) return false;
    if (isMac) return event.metaKey && !event.altKey && event.key.toLowerCase() === "p";
    return !event.metaKey && event.altKey && event.code === "KeyP";
  },
};
