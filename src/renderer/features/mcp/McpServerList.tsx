import { useState } from "react";
import type { McpProblem } from "../../../shared/mcpProblem";
import { McpServerCard } from "./McpServerCard";
import type { McpServerItem } from "./McpServerItem";
import { nextServerName } from "./nextServerName";
import type { ServerRow } from "./reconcileServerRows";
import { useServerRows } from "./useServerRows";

type Props = {
  servers: McpServerItem[];
  problems: McpProblem[];
  disabled: boolean;
  onChange: (servers: McpServerItem[]) => void;
};

/** Servers as cards, one open at a time. Each card has an id, so renaming it doesn't hand its draft to another server. */
export function McpServerList({ servers, problems, disabled, onChange }: Props) {
  const { rows, replace, takeId } = useServerRows(servers);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [added, setAdded] = useState<number | null>(null);
  const names = rows.map((row) => row.name);

  const commit = (next: ServerRow[]) => {
    replace(next);
    onChange(next.map(({ name, raw }) => ({ name, raw })));
  };
  const add = () => {
    const id = takeId();
    commit([...rows, { id, name: nextServerName(names), raw: { command: "" }, stash: {} }]);
    setExpanded(id);
    setAdded(id);
  };
  const remove = (id: number) => {
    commit(rows.filter((row) => row.id !== id));
    if (expanded === id) setExpanded(null);
    if (added === id) setAdded(null);
  };

  return (
    <>
      {rows.length > 0 ? (
        <ul className="mcp-cards">
          {rows.map((row, index) => (
            <McpServerCard
              key={row.id}
              item={row}
              otherNames={names.filter((_, i) => i !== index)}
              problems={problems.filter((problem) => problem.server === row.name)}
              expanded={expanded === row.id}
              justAdded={added === row.id}
              disabled={disabled}
              onToggle={() => {
                setExpanded(expanded === row.id ? null : row.id);
                setAdded(null);
              }}
              onChange={(next) =>
                commit(rows.map((current) =>
                  current.id === row.id ? { ...current, name: next.name, raw: next.raw, stash: next.stash ?? current.stash } : current,
                ))
              }
              onRemove={() => remove(row.id)}
            />
          ))}
        </ul>
      ) : (
        <div className="settings-note">No servers yet. Each agent still gets Birdsong's own.</div>
      )}
      <button type="button" className="btn mcp-add" disabled={disabled} onClick={add}>
        Add server
      </button>
    </>
  );
}
