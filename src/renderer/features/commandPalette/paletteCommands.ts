import { toggleDetailsVisible } from "../settings/details";
import { OPEN_SETTINGS_EVENT } from "../settings/openSettingsEvent";
import { modLabel } from "../shortcuts/modLabel";
import { pinShortcut } from "../sessions/pinShortcut";
import type { PaletteCommand } from "./PaletteCommand";
import type { PaletteContext } from "./PaletteContext";

const emit = (event: string) => () => window.dispatchEvent(new CustomEvent(event));

/** Commands share the same events as the application menus and keyboard shortcuts. */
export function paletteCommands(context: PaletteContext): PaletteCommand[] {
  const sessionRequired = context.hasSession ? undefined : "Select a session first.";
  const fileRequired = context.hasFile ? undefined : "Open a file first.";
  const textRequired = context.textFile ? undefined : "Open a text file first.";
  const filesRequired = sessionRequired ?? (context.filesReady ? undefined : "Files are still loading.");
  const command = (
    id: string, label: string, event: string, shortcut?: string, disabled?: string, aliases?: string,
  ): PaletteCommand => ({ id, label, run: emit(event), shortcut, disabled, aliases });

  const global: PaletteCommand[] = [
    command("settings", "Open Settings", OPEN_SETTINGS_EVENT, modLabel(","), undefined, "preferences configuration"),
    command("crons", "Open Crons", "birdsong:open-crons", undefined, undefined, "schedules automation"),
    command("reminders", "Open Reminders", "birdsong:open-reminders", undefined, undefined, "alerts"),
    { id: "sessions-folder", label: "Open Sessions Folder", aliases: "transcripts history directory",
      run: () => window.birdsong.openTranscriptsFolder() },
    { id: "zen", label: `${context.zenMode ? "Disable" : "Enable"} Zen Mode`, aliases: "toggle details",
      shortcut: modLabel("/"), run: toggleDetailsVisible },
    command("switch-mode", context.mode === "files" ? "Switch to Sessions" : "Switch to Files",
      "birdsong:toggle-explorer", undefined,
      context.hasSessions ? undefined : "Create a session first.", "toggle explorer view"),
    command("select-sessions", "Select Sessions Mode", "birdsong:select-sessions", modLabel("S", true)),
    command("select-files", "Select Files Mode", "birdsong:select-files", modLabel("E", true),
      context.hasSessions ? undefined : "Create a session first.", "explorer view"),
    command("focus-prompt", "Focus Prompt", "birdsong:focus-prompt", modLabel("I"), sessionRequired, "composer chat input"),
    command("diff", context.mode === "diff" ? "Leave Diff Mode" : "Show Git Diff", "birdsong:toggle-diff",
      undefined, sessionRequired, "changes source control git review staged unstaged"),
    command("select-diff", "Select Diff Mode", "birdsong:select-diff", modLabel("D", true), sessionRequired,
      "changes source control git review"),
  ];

  // The session rail is visible in both modes; these keep their shortcuts in Files mode too.
  const session: PaletteCommand[] = [
    command("fork-session", "Fork Session", "birdsong:fork-session", modLabel("N", true),
      sessionRequired ?? (context.supportsFork ? undefined : "This session does not support forking."), "duplicate branch"),
    command("rename-session", "Rename Session…", "birdsong:rename-session", modLabel("R"), sessionRequired),
    command("open-home", "Go to Home", "birdsong:open-home", modLabel("1"),
      context.homeOn ? undefined : "Set a Home folder in Settings.", "todos notes personal"),
    command("home-files", "Home Files", "birdsong:home-files", modLabel("2"),
      context.homeOn ? undefined : "Set a Home folder in Settings.", "explorer files folder"),
    command("pin-session", `${context.pinned ? "Unpin" : "Pin"} Session`, "birdsong:toggle-pin",
      pinShortcut.label, context.home ? "Home stays pinned." : sessionRequired, "toggle pin favorite"),
    command("unread-session", `Mark Session as ${context.unread ? "Read" : "Unread"}`, "birdsong:mark-unread",
      undefined, sessionRequired, "toggle read unread"),
  ];

  if (context.mode === "sessions") return [...global,
    command("new-session", "New Session…", "birdsong:new-session", modLabel("N"), undefined, "create chat"),
    ...session,
    command("close-session", "Close Session", "birdsong:close-session", modLabel("W"),
      context.home ? "Home can't be closed." : sessionRequired),
    command("filter-sessions", "Filter Sessions", "birdsong:focus-filter", modLabel("P"), undefined, "search sessions"),
    command("find", "Find in Current Session", "birdsong:find", modLabel("F"), sessionRequired, "search transcript"),
    command("find-history", "Find in History…", "birdsong:find-sessions", modLabel("F", true), undefined, "search all sessions"),
  ];

  if (context.mode === "diff") return [...global, ...session,
    command("close-session", "Close Session", "birdsong:close-session", modLabel("W"),
      context.home ? "Home can't be closed." : sessionRequired),
    command("refresh-diff", "Refresh Git Diff", "birdsong:refresh-diff", undefined, sessionRequired),
    command("find-diff", "Filter Changed Files", "birdsong:find-diff", modLabel("F"), sessionRequired),
  ];

  return [...global,
    ...session,
    command("new-file", "New File", "birdsong:new-file", modLabel("N"), filesRequired, "create untitled"),
    command("open-file", "Open File…", "birdsong:open-file", modLabel("O"), filesRequired),
    command("go-to-file", "Go to File…", "birdsong:go-to-file", modLabel("P"), filesRequired, "search files folders"),
    command("find-in-files", "Find in Files…", "birdsong:find-in-files", modLabel("F", true), filesRequired, "search working folder contents"),
    command("save-file", "Save File", "birdsong:save-file", modLabel("S"), textRequired, "write"),
    command("save-file-as", "Save File As…", "birdsong:save-file-as", undefined, textRequired),
    command("close-file", "Close File", "birdsong:close-file", modLabel("W"), fileRequired),
    command("find", "Find in File", "birdsong:find", modLabel("F"), textRequired, "search text"),
    command("word-wrap", `${context.wordWrap ? "Disable" : "Enable"} Word Wrap`, "birdsong:toggle-word-wrap",
      "Alt+Z", undefined, "toggle wrapping"),
  ];
}
