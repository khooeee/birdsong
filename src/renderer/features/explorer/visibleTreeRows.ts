import type { WorkingFolder } from "../../../shared/workingFolder";
import { childPath } from "./childPath";
import type { DirListing } from "./DirListing";
import { projectFolderName } from "./projectFolderName";
import type { TreeRow } from "./TreeRow";

/** Flatten the ordered roots, descending only into expanded folders. */
export function visibleTreeRows(
  listings: Record<string, DirListing>,
  expanded: ReadonlySet<string>,
  folders: readonly WorkingFolder[],
  collapsedRoots: readonly string[],
): TreeRow[] {
  const rows: TreeRow[] = [];
  const walk = (dir: string, depth: number, folderId: string) => {
    const listing = listings[dir];
    if (!listing || "error" in listing) return;
    for (const entry of listing.entries) {
      const path = childPath(dir, entry.name);
      const open = entry.kind === "dir" && expanded.has(path);
      const child = open ? listings[path] : undefined;
      rows.push({
        id: JSON.stringify([folderId, path]),
        folderId, path, name: entry.name, kind: entry.kind, depth, expanded: open,
        error: child && "error" in child ? child.error : undefined,
      });
      if (open) walk(path, depth + 1, folderId);
    }
  };
  for (const folder of folders) {
    const open = !collapsedRoots.includes(folder.path);
    const listing = listings[folder.path];
    rows.push({
      id: JSON.stringify([folder.id, null]),
      folderId: folder.id, rootId: folder.id, path: folder.path, name: projectFolderName(folder.path),
      kind: "dir", depth: 0, expanded: open,
      error: listing && "error" in listing ? listing.error : undefined,
    });
    if (open) walk(folder.path, 1, folder.id);
  }
  return rows;
}
