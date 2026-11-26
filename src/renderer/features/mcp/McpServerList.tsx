import { useState } from "react";
import type { McpProblem } from "../../../shared/mcpProblem";
import { McpServerCard } from "./McpServerCard";
import type { McpServerItem } from "./McpServerItem";
import { nextServerName } from "./nextServerName";

type Props = {
  servers: McpServerItem[];
  problems: McpProblem[];
  disabled: boolean;
  onChange: (servers: McpServerItem[]) => void;
};

/** Servers as cards, one open at a time. Cards are keyed by position so renaming keeps focus. */
export function McpServerList({ servers, problems, disabled, onChange }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [added, setAdded] = useState<number | null>(null);
  // Bumped on removal: cards after it shift position and must not keep the removed card's typing.
  const [generation, setGeneration] = useState(0);
  const names = servers.map((server) => server.name);

  const add = () => {
    onChange([...servers, { name: nextServerName(names), raw: { command: "" } }]);
    setExpanded(servers.length);
    setAdded(servers.length);
  };
  const remove = (index: number) => {
    onChange(servers.filter((_, i) => i !== index));
    setExpanded(null);
    setAdded(null);
    setGeneration((value) => value + 1);
  };

  return (
    <>
      {servers.length > 0 ? (
        <ul className="mcp-cards">
          {servers.map((item, index) => (
            <McpServerCard
              key={`${generation}:${index}`}
              item={item}
              otherNames={names.filter((_, i) => i !== index)}
              problems={problems.filter((problem) => problem.server === item.name)}
              expanded={expanded === index}
              justAdded={added === index}
              disabled={disabled}
              onToggle={() => {
                setExpanded(expanded === index ? null : index);
                setAdded(null);
              }}
              onChange={(next) => onChange(servers.map((server, i) => (i === index ? next : server)))}
              onRemove={() => remove(index)}
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
