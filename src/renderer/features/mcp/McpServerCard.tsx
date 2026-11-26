import type { McpProblem } from "../../../shared/mcpProblem";
import { ChevronIcon } from "../explorer/ChevronIcon";
import { joinCommandLine } from "./joinCommandLine";
import { McpServerForm } from "./McpServerForm";
import type { McpServerItem } from "./McpServerItem";
import { patchRecord } from "./patchRecord";
import { readMcpServerFields } from "./readMcpServerFields";

type Props = {
  item: McpServerItem;
  otherNames: string[];
  problems: McpProblem[];
  expanded: boolean;
  justAdded: boolean;
  disabled: boolean;
  onToggle: () => void;
  onChange: (item: McpServerItem) => void;
  onRemove: () => void;
};

/** One server: a switch, its name and what it runs, its problems, and the form when expanded. */
export function McpServerCard({ item, otherNames, problems, expanded, justAdded, disabled, onToggle, onChange, onRemove }: Props) {
  const fields = readMcpServerFields(item.raw);
  const summary = fields.kind === "url" ? fields.url : joinCommandLine(fields.words);

  return (
    <li className={fields.enabled ? "mcp-card" : "mcp-card off"}>
      <div className="mcp-card-header">
        <input
          type="checkbox"
          checked={fields.enabled}
          disabled={disabled}
          aria-label={`Connect ${item.name}`}
          title={fields.enabled ? "Connected in new sessions" : "Off: kept here, not connected"}
          onChange={(e) => onChange({ ...item, raw: patchRecord(item.raw, { enabled: e.target.checked ? undefined : false }) })}
        />
        <button type="button" className="mcp-card-toggle" aria-expanded={expanded} onClick={onToggle}>
          <span className="mcp-card-name">{item.name || "Unnamed"}</span>
          <span className="mcp-card-summary">{summary || (fields.kind === "url" ? "No URL yet" : "No command yet")}</span>
          <span className="mcp-card-chevron"><ChevronIcon /></span>
        </button>
      </div>
      {problems.map((problem) => (
        <div key={problem.message} className="mcp-card-problem settings-warning">{problem.message}</div>
      ))}
      {expanded && (
        <McpServerForm
          item={item}
          otherNames={otherNames}
          disabled={disabled}
          autoFocus={justAdded}
          onChange={onChange}
          onRemove={onRemove}
        />
      )}
    </li>
  );
}
