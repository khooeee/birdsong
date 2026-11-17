import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { CommandPaletteRow } from "./CommandPaletteRow";
import { nextCommandId } from "./nextCommandId";
import { rankCommands } from "./rankCommands";
import { usePaletteCommands } from "./usePaletteCommands";
import type { PaletteCommand } from "./PaletteCommand";
import type { PaletteTarget } from "./PaletteTarget";

/** Search and selection live here so typing cannot re-render the app or its transcript. */
export function CommandPaletteContent({ target, onRun }: {
  target: PaletteTarget;
  onRun: (command: PaletteCommand) => void;
}) {
  const commands = usePaletteCommands(target);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const results = useMemo(() => rankCommands(commands, query), [commands, query]);
  const selected = results.find(({ command }) => command.id === selectedId && !command.disabled)
    ?? results.find(({ command }) => !command.disabled);
  const currentId = selected?.command.id ?? null;
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef(results);
  resultsRef.current = results;

  const pick = useCallback((id: string) => {
    const command = resultsRef.current.find((hit) => hit.command.id === id)?.command;
    if (command && !command.disabled) onRun(command);
  }, [onRun]);

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [currentId, results]);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedId(nextCommandId(results, currentId, event.key === "ArrowDown" ? 1 : -1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (!event.repeat && currentId) pick(currentId);
    }
  };

  return (
    <>
      <input
        autoFocus
        value={query}
        spellCheck={false}
        autoComplete="off"
        placeholder="Type a command…"
        aria-label="Search commands"
        role="combobox"
        aria-expanded
        aria-autocomplete="list"
        aria-controls={listId}
        aria-activedescendant={currentId ? `${listId}-${currentId}` : undefined}
        onChange={(event) => {
          setQuery(event.target.value);
          setSelectedId(null);
        }}
        onKeyDown={onKeyDown}
      />
      <div ref={listRef} id={listId} className="command-palette-results" role="listbox" aria-label="Commands">
        {results.map(({ command, positions }) => (
          <CommandPaletteRow
            key={command.id}
            id={`${listId}-${command.id}`}
            command={command}
            positions={positions}
            selected={command.id === currentId}
            onPick={pick}
          />
        ))}
        {!results.length ? <div className="command-palette-empty" role="status">No matching commands.</div> : null}
      </div>
      <div className="command-palette-help">↑↓ to navigate · Enter to run · Esc to close</div>
    </>
  );
}
