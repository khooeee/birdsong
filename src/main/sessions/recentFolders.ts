import { getAppSettings } from "../appSettings";
import type { SessionState } from "./SessionState";
import { uniqueRecentFolders } from "./uniqueRecentFolders";

/**
 * Folders the Mac and iPhone new session forms offer: saved picks first, then the modal's last folder,
 * then rail sessions' folders, newest first, so the menu is useful before anything is saved.
 */
export function recentFolders(state: SessionState): string[] {
  const { recentCwds, lastCwd } = getAppSettings();
  const railFolders = [...state.sessions.values()]
    .filter((session) => session.id !== state.homeId && !session.cron)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((session) => session.cwd);
  return uniqueRecentFolders([...recentCwds, lastCwd, ...railFolders]);
}
