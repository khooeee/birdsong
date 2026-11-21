import { memo, useCallback, useState, type DragEvent } from "react";
import { ChevronIcon } from "./ChevronIcon";
import type { TreeRow } from "./TreeRow";

const DRAG_TYPE = "application/x-birdsong-working-folder";

type Props = TreeRow & {
  rootId: string;
  sessionId: string;
  previousId?: string;
  nextId?: string;
  afterNextId?: string;
  first: boolean;
  last: boolean;
  selected: boolean;
  picking?: boolean;
  onToggle: (id: string) => void;
  onLocate: (id: string, path: string) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, beforeId?: string) => void;
};

/** A draggable root. Removing it only changes the list; open editor tabs stay put. */
export const WorkingFolderRow = memo(function WorkingFolderRow({
  id, rootId, sessionId, path, name, expanded, error, missing, selected, picking,
  previousId, nextId, afterNextId, first, last, onToggle, onLocate, onRemove, onMove,
}: Props) {
  const [dropTarget, setDropTarget] = useState<"before" | "after" | null>(null);
  const toggle = useCallback(() => onToggle(id), [onToggle, id]);
  const locate = useCallback(() => onLocate(rootId, path), [onLocate, rootId, path]);
  const remove = useCallback(() => onRemove(rootId), [onRemove, rootId]);
  const moveUp = useCallback(() => onMove(rootId, previousId), [onMove, rootId, previousId]);
  const moveDown = useCallback(() => onMove(rootId, afterNextId), [onMove, rootId, afterNextId]);
  const dragOver = (event: DragEvent) => {
    if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const bounds = event.currentTarget.getBoundingClientRect();
    setDropTarget(event.clientY < bounds.top + bounds.height / 2 ? "before" : "after");
  };
  return (
    <div
      role="treeitem"
      aria-level={1}
      aria-selected={selected}
      aria-expanded={missing ? undefined : expanded}
      className={`explorer-row working-folder-row${selected ? " selected" : ""}${error ? " error" : ""}${missing ? " missing" : ""}${dropTarget ? ` drop-${dropTarget}` : ""}`}
      data-path={path}
      data-row-id={id}
      title={error ? `${path}\nUnavailable: ${error}` : path}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ sessionId, rootId }));
      }}
      onDragOver={dragOver}
      onDragLeave={() => setDropTarget(null)}
      onDragEnd={() => setDropTarget(null)}
      onDrop={(event) => {
        event.preventDefault();
        setDropTarget(null);
        try {
          const source = JSON.parse(event.dataTransfer.getData(DRAG_TYPE));
          if (source.sessionId === sessionId && typeof source.rootId === "string") onMove(source.rootId, dropTarget === "after" ? nextId : rootId);
        } catch { /* Ignore unrelated drags. */ }
      }}
    >
      <button type="button" className="working-folder-toggle" onClick={toggle} aria-label={missing ? `${path}, folder missing` : `${expanded ? "Collapse" : "Expand"} ${path}`}>
        {missing ? null : <span className="explorer-chevron"><ChevronIcon /></span>}
        <span className="explorer-name">{name}</span>
        {error ? <span className="working-folder-unavailable">{missing ? "Folder missing" : "Unavailable"}</span> : null}
      </button>
      <div className="working-folder-actions">
        <button type="button" disabled={first} title="Move Up" aria-label={`Move ${path} up`} onClick={moveUp}>↑</button>
        <button type="button" disabled={last} title="Move Down" aria-label={`Move ${path} down`} onClick={moveDown}>↓</button>
        {missing ? null : <button type="button" title="Remove Working Folder" aria-label={`Remove ${path} from working folders`} onClick={remove}>×</button>}
      </div>
      {missing ? (
        <div className="working-folder-recovery">
          <button type="button" disabled={picking} onClick={locate} aria-label={`Locate folder ${path}`}>Locate folder…</button>
          <button type="button" onClick={remove} title="Remove from list" aria-label={`Remove ${path} from working folders`}>Remove</button>
        </div>
      ) : null}
    </div>
  );
});
