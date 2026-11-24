import type * as acp from "@agentclientprotocol/sdk/unstable";
import type { AgentKind } from "../../shared/agentKind";
import { birdsongMcpServers } from "./birdsongMcpServers";
import { customMcpServers } from "./custom/customMcpServers";

/** Every MCP server a session gets: Birdsong's own, then the user's. */
export async function sessionMcpServers(sessionId: string, agent: AgentKind): Promise<acp.McpServer[]> {
  const [birdsong, custom] = await Promise.all([birdsongMcpServers(sessionId), customMcpServers(agent)]);
  return [...birdsong, ...custom];
}
