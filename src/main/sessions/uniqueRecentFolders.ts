const MAX_RECENT_FOLDERS = 10;

/** Trimmed, non-blank folders in their given order, without repeats, capped for the recent folders menus. */
export function uniqueRecentFolders(folders: readonly string[]): string[] {
  const unique = new Set(folders.map((folder) => folder.trim()).filter(Boolean));
  return [...unique].slice(0, MAX_RECENT_FOLDERS);
}
