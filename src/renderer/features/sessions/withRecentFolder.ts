const MAX_RECENT_FOLDERS = 10;

/** `folder` moved to the front of `recent`, deduplicated and capped. Blank folders are skipped. */
export function withRecentFolder(recent: readonly string[], folder: string): string[] {
  const next = folder.trim();
  const rest = recent.map((entry) => entry.trim()).filter((entry) => entry && entry !== next);
  return [...new Set([...(next ? [next] : []), ...rest])].slice(0, MAX_RECENT_FOLDERS);
}
