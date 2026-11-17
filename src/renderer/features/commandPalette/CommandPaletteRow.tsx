import { memo } from "react";
import { highlightMatches } from "../goToFile/highlightMatches";
import type { PaletteCommand } from "./PaletteCommand";

/** All props stay stable during streaming; selection changes update only the affected rows. */
export const CommandPaletteRow = memo(function CommandPaletteRow({ id, command, positions, selected, onPick }: {
  id: string;
  command: PaletteCommand;
  positions: readonly number[];
  selected: boolean;
  onPick: (id: string) => void;
}) {
  return (
    <div
      id={id}
      className="command-palette-row"
      role="option"
      aria-selected={selected}
      aria-disabled={!!command.disabled}
      title={command.disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onPick(command.id)}
    >
      <div className="command-palette-label">
        <span>{highlightMatches(command.label, 0, positions)}</span>
        {command.disabled ? <small>{command.disabled}</small> : null}
      </div>
      {command.shortcut ? <kbd>{command.shortcut}</kbd> : null}
    </div>
  );
});
