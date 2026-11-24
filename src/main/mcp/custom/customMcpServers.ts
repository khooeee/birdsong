import type * as acp from "@agentclientprotocol/sdk/unstable";
import type { AgentKind } from "../../../shared/agentKind";
import { errorMessage } from "../../../shared/errorMessage";
import { shellEnv } from "../../shellEnv/shellEnv";
import { expandMcpServer } from "./expandMcpServer";
import { mcpServerProblem } from "./mcpServerProblem";
import { parseMcpServers } from "./parseMcpServers";
import { readMcpServersFile } from "./readMcpServersFile";
import { toAcpMcpServer } from "./toAcpMcpServer";

/**
 * The user's servers from mcp.json that `agent` can connect to. A broken file or entry never stops a session.
 * Claude expands variables itself, and its servers go on the CLI's command line, so it gets the references:
 * values would show in `ps`. Codex and Cursor need the values.
 */
export async function customMcpServers(agent: AgentKind): Promise<acp.McpServer[]> {
  try {
    const { servers } = parseMcpServers(await readMcpServersFile());
    const env = await shellEnv.get();
    return servers
      .filter((server) => mcpServerProblem(server, env) === null)
      .map((server) => toAcpMcpServer(agent === "claude" ? server : expandMcpServer(server, env).server));
  } catch (error) {
    console.warn("[mcp] could not read mcp.json:", errorMessage(error));
    return [];
  }
}
