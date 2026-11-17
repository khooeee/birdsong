import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { PersistedExplorer } from "../../shared/persistedExplorer";

/** Old tabs and tree paths were relative to cwd. Absolute paths survive root removal and reorder. */
export async function migrateExplorerPaths(saved: PersistedExplorer, cwd: string): Promise<PersistedExplorer> {
  const root = await fs.realpath(cwd).catch(() => path.resolve(cwd));
  const absolute = (file: string) => path.resolve(root, file).split(path.sep).join("/");
  const nullable = (file: string | null) => file === null ? null : absolute(file);
  return {
    ...saved,
    expanded: saved.expanded.map(absolute),
    collapsedRoots: saved.collapsedRoots ?? [],
    selected: nullable(saved.selected),
    openFiles: [...new Set(saved.openFiles.map(absolute))],
    activeFile: nullable(saved.activeFile),
    previewFile: nullable(saved.previewFile),
    fileTops: Object.fromEntries(Object.entries(saved.fileTops).map(([file, top]) => [absolute(file), top])),
  };
}
