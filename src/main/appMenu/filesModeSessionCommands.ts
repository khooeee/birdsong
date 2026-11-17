/** Session menu commands that stay enabled in File Explorer mode: no File menu command takes their shortcut. */
export const FILES_MODE_SESSION_COMMANDS: ReadonlySet<string> = new Set([
  "birdsong:fork-session",
  "birdsong:rename-session",
  "birdsong:toggle-pin",
  "birdsong:mark-unread",
  "birdsong:focus-prompt",
  "birdsong:session-back",
  "birdsong:session-forward",
]);
