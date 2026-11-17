import type { PathEntry } from "./PathEntry";
import { toPathEntry } from "./toPathEntry";

/** Each file plus every folder that holds one, since the file list names files only. */
export function pathEntries(files: readonly string[], roots: readonly string[]): PathEntry[] {
  const dirs = new Set<string>();
  const entries: PathEntry[] = [];
  for (const file of files) {
    entries.push(toPathEntry(file, "file"));
    // Walk up until a folder already seen; its parents were added with it.
    for (let slash = file.lastIndexOf("/"); slash > 0; slash = file.lastIndexOf("/", slash - 1)) {
      const dir = file.slice(0, slash);
      if (!roots.some((root) => dir === root || dir.startsWith(root.endsWith("/") ? root : `${root}/`))) break;
      if (dirs.has(dir)) break;
      dirs.add(dir);
      entries.push(toPathEntry(dir, "dir"));
    }
  }
  return entries;
}
