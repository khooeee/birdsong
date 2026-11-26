import { useEffect, useMemo, useState } from "react";
import { formatMcpProblem } from "../../../shared/formatMcpProblem";
import { ipcErrorMessage } from "../../../shared/ipcErrorMessage";
import type { SettingsFieldsProps } from "../settings/SettingsFieldsProps";
import { McpJsonField } from "./McpJsonField";
import { McpServerList } from "./McpServerList";
import { readMcpServers } from "./readMcpServers";
import { useMcpServerProblems } from "./useMcpServerProblems";
import { writeMcpServers } from "./writeMcpServers";
import "./mcpSettings.css";

/** Custom MCP servers for every agent, as a list of cards or as mcp.json text. Both edit the same text. */
export function McpSettingsFields({ draft, busy, onChange }: SettingsFieldsProps) {
  const [saved, setSaved] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [asJson, setAsJson] = useState(false);
  const text = draft.mcpServers ?? saved;
  const problems = useMcpServerProblems(text ?? "");
  const servers = useMemo(() => (text === null ? null : readMcpServers(text)), [text]);
  // Text the list can't show stays in JSON until switched back, so fixing it doesn't jump out of the box.
  const showJson = asJson || servers === null;
  const names = new Set(servers?.map((server) => server.name));
  const fileProblems = problems.filter((problem) => problem.server === null || !names.has(problem.server));

  useEffect(() => {
    window.birdsong.getMcpServers().then(setSaved, (error) => setLoadError(ipcErrorMessage(error)));
  }, []);

  useEffect(() => {
    if (text !== null && servers === null) setAsJson(true);
  }, [text, servers]);

  const setText = (next: string) => onChange({ mcpServers: next });

  return (
    <>
      <div className="mcp-heading">
        <h3 className="settings-section">MCP servers</h3>
        {text !== null && (
          <button
            type="button"
            className="mcp-link-btn"
            disabled={busy || (showJson && servers === null)}
            title={showJson && servers === null ? "Fix the JSON to edit it as a list" : undefined}
            onClick={() => setAsJson(!showJson)}
          >
            {showJson ? "Edit as list" : "Edit as JSON"}
          </button>
        )}
      </div>
      {loadError && <div className="settings-warning">{loadError}</div>}
      {text === null ? (
        !loadError && <div className="settings-note">Loading…</div>
      ) : showJson ? (
        <McpJsonField text={text} problems={problems} disabled={busy} onChange={setText} />
      ) : (
        <>
          {fileProblems.map((problem) => (
            <div key={formatMcpProblem(problem)} className="settings-warning">{formatMcpProblem(problem)}</div>
          ))}
          <McpServerList servers={servers ?? []} problems={problems} disabled={busy}
            onChange={(next) => setText(writeMcpServers(text, next))} />
        </>
      )}
      <div className="settings-note">
        {"Every agent gets these. New sessions get them on Save; open ones when they reconnect. Keep secrets in your shell and write ${VAR}."}
      </div>
    </>
  );
}
