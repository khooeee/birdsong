import { memo } from "react";
import { displayPath } from "../editor/displayPath";
import { isUntitledPath } from "../editor/isUntitledPath";
import { highlightMatches } from "./highlightMatches";
import type { PathEntry } from "./PathEntry";

interface Props {
  id: string;
  index: number;
  entry: PathEntry;
  positions: readonly number[];
  selected: boolean;
  onPick: (index: number) => void;
}

/** One result: the name, then the folder holding it (an untitled tab has none); folders end in "/". */
export const GoToFileRow = memo(function GoToFileRow({ id, index, entry, positions, selected, onPick }: Props) {
  const { path, kind, label, nameStart } = entry;
  return (
    <div
      id={id}
      role="option"
      className="go-to-file-row"
      aria-selected={selected}
      title={displayPath(path)}
      // Keep focus in the search box.
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onPick(index)}
    >
      <span className="go-to-file-name">
        {highlightMatches(label.slice(nameStart), nameStart, positions)}
        {kind === "dir" ? "/" : null}
      </span>
      {nameStart === 0 || isUntitledPath(path) ? null : (
        <span className="go-to-file-dir">{highlightMatches(label.slice(0, nameStart - 1), 0, positions)}</span>
      )}
    </div>
  );
});
