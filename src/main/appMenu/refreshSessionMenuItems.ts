import { Menu, type MenuItem } from "electron";
import { FILES_MODE_SESSION_COMMANDS } from "./filesModeSessionCommands";
import { SESSION_MENU_IDS } from "./sessionMenuIds";
import type { RailMode } from "../../shared/railMode";

/** Enable or disable an item and, for a menu, everything in it, so a disabled menu's shortcuts are off too. */
function setEnabled(item: MenuItem | null, enabled: boolean): void {
  if (!item) return;
  item.enabled = enabled;
  for (const child of item.submenu?.items ?? []) child.enabled = enabled;
}

/** Refresh mode command availability in place without rebuilding the menu. */
export function refreshSessionMenuItems(mode: RailMode, hasSessions: boolean, editorWordWrap: boolean): void {
  const sessionsMode = mode === "sessions" || !hasSessions;
  const filesMode = mode === "files" && hasSessions;
  const menu = Menu.getApplicationMenu();
  if (!menu) return;
  const explorer = menu.getMenuItemById("select-files-mode");
  if (explorer) explorer.enabled = hasSessions;
  const selectDiff = menu.getMenuItemById("select-diff-mode");
  if (selectDiff) selectDiff.enabled = hasSessions;
  const wordWrap = menu.getMenuItemById("editor-word-wrap");
  if (wordWrap) {
    wordWrap.enabled = filesMode;
    wordWrap.checked = editorWordWrap;
  }
  setEnabled(menu.getMenuItemById(SESSION_MENU_IDS.findInHistory), sessionsMode);
  const session = menu.getMenuItemById(SESSION_MENU_IDS.sessionMenu);
  if (session) {
    session.enabled = sessionsMode || hasSessions;
    for (const item of session.submenu?.items ?? []) {
      const diffSessionCommand = mode === "diff" && ["birdsong:next-session", "birdsong:prev-session", "birdsong:close-session"].includes(item.id);
      item.enabled = sessionsMode || (hasSessions && (FILES_MODE_SESSION_COMMANDS.has(item.id) || diffSessionCommand));
    }
  }
  setEnabled(menu.getMenuItemById("file-menu"), filesMode);
}
