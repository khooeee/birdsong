import type { TreeRow } from "./TreeRow";

export type TreeKeyAction =
  | { type: "select" | "open"; row: TreeRow }
  | { type: "expand"; row: TreeRow; open: boolean };

/** Navigate row identities so overlapping roots can show the same path independently. */
export function treeKeyAction(rows: TreeRow[], selectedId: string | null, key: string): TreeKeyAction | null {
  if (rows.length === 0) return null;
  const index = selectedId === null ? -1 : rows.findIndex((row) => row.id === selectedId);
  const row = index >= 0 ? rows[index] : null;
  const selectAt = (i: number): TreeKeyAction => ({ type: "select", row: rows[Math.max(0, Math.min(rows.length - 1, i))] });

  switch (key) {
    case "ArrowDown": return selectAt(index + 1);
    case "ArrowUp": return selectAt(index < 0 ? 0 : index - 1);
    case "Home": return selectAt(0);
    case "End": return selectAt(rows.length - 1);
    case "ArrowRight":
      if (!row) return selectAt(0);
      if (row.kind !== "dir" || row.missing) return null;
      if (!row.expanded) return { type: "expand", row, open: true };
      return rows[index + 1]?.depth === row.depth + 1 ? selectAt(index + 1) : null;
    case "ArrowLeft": {
      if (!row) return selectAt(0);
      if (row.kind === "dir" && row.expanded) return { type: "expand", row, open: false };
      for (let i = index - 1; i >= 0; i--) {
        if (rows[i].folderId !== row.folderId) break;
        if (rows[i].depth === row.depth - 1) return selectAt(i);
      }
      return null;
    }
    case "Enter":
      if (!row || row.missing) return null;
      return row.kind === "dir"
        ? { type: "expand", row, open: !row.expanded }
        : { type: "open", row };
    default: return null;
  }
}
