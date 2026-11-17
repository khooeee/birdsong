/** Saved file explorer; paths are absolute (older saves may use cwd-relative paths). */
export interface PersistedExplorer {
  expanded: string[];
  collapsedRoots?: string[];
  selected: string | null;
  openFiles: string[];
  activeFile: string | null;
  previewFile: string | null;
  treeScrollTop: number;
  /** Document position at the top of each open file's viewport. */
  fileTops: Record<string, number>;
}
