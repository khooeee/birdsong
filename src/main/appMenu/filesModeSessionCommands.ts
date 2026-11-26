/**
 * Session menu commands that stay enabled in File Explorer mode: no File menu or editor command takes their shortcut.
 * Mark as Unread is left out so the editor keeps Cmd/Ctrl+U (undo selection).
 */
export const FILES_MODE_SESSION_COMMANDS: ReadonlySet<string> = new Set([
  "birdsong:fork-session",
  "birdsong:rename-session",
  "birdsong:toggle-pin",
  "birdsong:focus-prompt",
  "birdsong:session-back",
  "birdsong:session-forward",
]);
