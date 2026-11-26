import type { McpProblem } from "../../../shared/mcpProblem";
import { formatMcpProblem } from "../../../shared/formatMcpProblem";
import { MCP_SERVERS_EXAMPLE } from "./mcpServersExample";

type Props = { text: string; problems: McpProblem[]; disabled: boolean; onChange: (text: string) => void };

/** mcp.json as typed, for pasting a config from elsewhere or fixing what the list can't show. */
export function McpJsonField({ text, problems, disabled, onChange }: Props) {
  return (
    <>
      <textarea
        className="mcp-servers-json"
        aria-label="mcp.json"
        rows={9}
        value={text}
        disabled={disabled}
        spellCheck={false}
        placeholder={MCP_SERVERS_EXAMPLE}
        onChange={(e) => onChange(e.target.value)}
      />
      {problems.map((problem) => (
        <div key={formatMcpProblem(problem)} className="settings-warning">{formatMcpProblem(problem)}</div>
      ))}
    </>
  );
}
