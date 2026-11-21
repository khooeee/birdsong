import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { WorkingFolder } from "../../../shared/workingFolder";
import { previewFileTab } from "../editor/previewFileTab";
import { deleteTreePath } from "./deleteTreePath";
import { dirListingStore } from "./dirListingStore";
import { explorerStore } from "./explorerStore";
import { FileTreeRow } from "./FileTreeRow";
import { renameTreePath } from "./renameTreePath";
import { treeKeyAction } from "./treeKeyAction";
import type { TreeRow } from "./TreeRow";
import { treeScrollMemory } from "./treeScrollMemory";
import { useDirListings } from "./useDirListings";
import { useExplorerState } from "./useExplorerState";
import { useRestoredScroll } from "./useRestoredScroll";
import { useTreeReveal } from "./useTreeReveal";
import { visibleTreeRows } from "./visibleTreeRows";
import { WorkingFolderRow } from "./WorkingFolderRow";

function setExpanded(sessionId: string, row: TreeRow, open: boolean): void {
  if (row.rootId) explorerStore.setRootCollapsed(sessionId, row.path, !open);
  else explorerStore.setExpanded(sessionId, row.path, open);
}

/** The session's working folders, with stable identities for each appearance of a path. */
export function FileTree({ sessionId, folders, picking, onLocate, onRemove, onMove }: {
  sessionId: string;
  folders: WorkingFolder[];
  picking: boolean;
  onLocate: (id: string, path: string) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, beforeId?: string) => void;
}) {
  const state = useExplorerState(sessionId);
  const listings = useDirListings(sessionId);
  const expanded = useMemo(() => new Set(state.expanded), [state.expanded]);
  const rows = useMemo(() => visibleTreeRows(listings, expanded, folders, state.collapsedRoots),
    [listings, expanded, folders, state.collapsedRoots]);
  const byId = useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows]);
  const rowsRef = useRef(byId);
  rowsRef.current = byId;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const clicked = selectedId ? byId.get(selectedId) : undefined;
  const selected = clicked?.path === state.selected ? clicked : rows.find((row) => row.path === state.selected);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  useRestoredScroll(sessionId, scrollRef, rows, treeScrollMemory);
  useTreeReveal(sessionId, scrollRef, rows, selected?.id ?? null);

  useEffect(() => {
    for (const folder of folders) dirListingStore.ensure(sessionId, folder.path);
    for (const row of rows) {
      if (row.kind === "dir" && row.expanded) dirListingStore.ensure(sessionId, row.path);
    }
  }, [sessionId, rows, folders]);

  const onRowClick = useCallback((id: string) => {
    const row = rowsRef.current.get(id);
    if (!row) return;
    setSelectedId(id);
    if (row.kind === "file") previewFileTab(sessionId, row.path);
    else {
      explorerStore.select(sessionId, row.path);
      if (!row.missing) setExpanded(sessionId, row, !row.expanded);
    }
  }, [sessionId]);

  const onRowDoubleClick = useCallback((id: string) => {
    const row = rowsRef.current.get(id);
    if (row?.kind === "file") explorerStore.openFile(sessionId, row.path);
  }, [sessionId]);

  const onRowContextMenu = useCallback(async (id: string) => {
    const row = rowsRef.current.get(id);
    if (!row) return;
    setSelectedId(id);
    explorerStore.select(sessionId, row.path);
    const action = await window.birdsong.showFileContextMenu(sessionId, row.path);
    if (action === "rename") setRenaming(id);
    else if (action === "delete") void deleteTreePath(sessionId, row.path);
  }, [sessionId]);

  const onRowRename = useCallback((id: string, name: string | null) => {
    setRenaming(null);
    const row = rowsRef.current.get(id);
    if (row && name !== null) void renameTreePath(sessionId, row.path, name);
  }, [sessionId]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Native controls own Enter/Space and editing/navigation keys while focused.
    if ((event.target as HTMLElement).closest("button, input, textarea, select, [contenteditable]")) return;
    const action = treeKeyAction(rows, selected?.id ?? null, event.key);
    if (!action) return;
    event.preventDefault();
    setSelectedId(action.row.id);
    if (action.type === "open") explorerStore.openFile(sessionId, action.row.path);
    else {
      explorerStore.select(sessionId, action.row.path);
      if (action.type === "expand") setExpanded(sessionId, action.row, action.open);
    }
    requestAnimationFrame(() => {
      scrollRef.current?.querySelector(".explorer-row.selected")?.scrollIntoView({ block: "nearest" });
    });
  };

  return (
    <div ref={scrollRef} className="explorer-tree" role="tree" aria-label="Files" tabIndex={0} onKeyDown={onKeyDown}>
      {rows.map((row) => row.rootId ? (
        <WorkingFolderRow
          key={row.id}
          {...row}
          rootId={row.rootId}
          sessionId={sessionId}
          first={row.rootId === folders[0]?.id}
          last={row.rootId === folders.at(-1)?.id}
          previousId={folders[folders.findIndex((folder) => folder.id === row.rootId) - 1]?.id}
          nextId={folders[folders.findIndex((folder) => folder.id === row.rootId) + 1]?.id}
          afterNextId={folders[folders.findIndex((folder) => folder.id === row.rootId) + 2]?.id}
          selected={row.id === selected?.id}
          picking={row.missing ? picking : undefined}
          onToggle={onRowClick}
          onLocate={onLocate}
          onRemove={onRemove}
          onMove={onMove}
        />
      ) : (
        <FileTreeRow
          key={row.id}
          {...row}
          selected={row.id === selected?.id}
          renaming={row.id === renaming}
          onClick={onRowClick}
          onDoubleClick={onRowDoubleClick}
          onContextMenu={onRowContextMenu}
          onRename={onRowRename}
        />
      ))}
    </div>
  );
}
