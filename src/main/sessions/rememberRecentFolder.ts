import { getAppSettings, patchAppSettings } from "../appSettings";
import { uniqueRecentFolders } from "./uniqueRecentFolders";

/** Move `cwd` to the front of the saved recent folders; the next state file write persists it. */
export function rememberRecentFolder(cwd: string): void {
  patchAppSettings({ recentCwds: uniqueRecentFolders([cwd, ...getAppSettings().recentCwds]) });
}
