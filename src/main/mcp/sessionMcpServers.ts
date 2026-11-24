import type * as acp from "@agentclientprotocol/sdk/unstable";
import { birdsongMcpServers } from "./birdsongMcpServers";
import { loadCustomMcpServers } from "./loadCustomMcpServers";

/** Every session's MCP servers: Birdsong's own server first, then the user's mcp.json entries. */
export async function sessionMcpServers(sessionId: string): Promise<acp.McpServer[]> {
  const [birdsong, custom] = await Promise.all([birdsongMcpServers(sessionId), loadCustomMcpServers()]);
  return [...birdsong, ...custom];
}
