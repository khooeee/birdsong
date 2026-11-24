import { useEffect, useState } from "react";
import { ipcErrorMessage } from "../../../shared/ipcErrorMessage";
import type { SettingsFieldsProps } from "../settings/SettingsFieldsProps";
import { MCP_SERVERS_EXAMPLE } from "./mcpServersExample";
import { useMcpServerProblems } from "./useMcpServerProblems";
import "./mcpSettings.css";

/** Custom MCP servers for every agent, edited as mcp.json text. */
export function McpSettingsFields({ draft, busy, onChange }: SettingsFieldsProps) {
  const [saved, setSaved] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const text = draft.mcpServers ?? saved;
  const problems = useMcpServerProblems(text ?? "");

  useEffect(() => {
    window.birdsong.getMcpServers().then(setSaved, (error) => setLoadError(ipcErrorMessage(error)));
  }, []);

  return (
    <>
      <h3 className="settings-section">MCP</h3>
      <label>
        MCP servers for every agent (JSON)
        <textarea
          className="mcp-servers-json"
          rows={9}
          value={text ?? ""}
          // Typing before the file loads would replace it.
          disabled={busy || text === null}
          spellCheck={false}
          placeholder={MCP_SERVERS_EXAMPLE}
          onChange={(e) => onChange({ mcpServers: e.target.value })}
        />
      </label>
      {loadError && <div className="settings-warning">{loadError}</div>}
      {problems.map((problem) => <div key={problem} className="settings-warning">{problem}</div>)}
      <div className="settings-note">
        {"New sessions get these on Save; open ones when they reconnect. Keep secrets in your shell and write ${VAR}."}
      </div>
    </>
  );
}
