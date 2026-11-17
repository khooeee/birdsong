/** One session's file explorer. Paths are absolute across all working folders. */
export interface ExplorerState {
  /** Expanded child folders and explicitly collapsed roots. */
  expanded: readonly string[];
  collapsedRoots: readonly string[];
  /** Highlighted tree row. */
  selected: string | null;
  /** Editor tabs, left to right. */
  openFiles: readonly string[];
  activeFile: string | null;
  /** The tab the next previewed file takes over; null once it is kept. */
  previewFile: string | null;
}
