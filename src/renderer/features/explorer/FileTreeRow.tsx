import { memo, type CSSProperties } from "react";
import { ChevronIcon } from "./ChevronIcon";
import { FileTreeRename } from "./FileTreeRename";
import type { TreeRow } from "./TreeRow";

type Props = TreeRow & {
  selected: boolean;
  renaming: boolean;
  onClick: (id: string) => void;
  onDoubleClick: (id: string) => void;
  onContextMenu: (id: string) => void;
  /** The rename field closed: with the new name, or null when cancelled. */
  onRename: (id: string, name: string | null) => void;
};

/** One file or folder line; folders show a chevron, and a read error tints the name. */
export const FileTreeRow = memo(function FileTreeRow({
  id,
  path,
  name,
  kind,
  depth,
  expanded,
  error,
  selected,
  renaming,
  onClick,
  onDoubleClick,
  onContextMenu,
  onRename,
}: Props) {
  return (
    <div
      role="treeitem"
      className={`explorer-row${selected ? " selected" : ""}${error ? " error" : ""}`}
      style={{ "--depth": depth } as CSSProperties}
      aria-level={depth + 1}
      aria-selected={selected}
      aria-expanded={kind === "dir" ? expanded : undefined}
      data-path={path}
      data-row-id={id}
      title={error ?? path}
      onClick={renaming ? undefined : () => onClick(id)}
      onDoubleClick={renaming ? undefined : () => onDoubleClick(id)}
      onContextMenu={(event) => {
        event.preventDefault();
        if (!renaming) onContextMenu(id);
      }}
    >
      <span className="explorer-chevron">{kind === "dir" ? <ChevronIcon /> : null}</span>
      {renaming ? (
        <FileTreeRename name={name} onDone={(next) => onRename(id, next)} />
      ) : (
        <span className="explorer-name">{name}</span>
      )}
    </div>
  );
});
