import type * as acp from "@agentclientprotocol/sdk/unstable";
import { liveControlEndpoint } from "../control/liveControlEndpoint";
import { BIRDSONG_SERVER_NAME } from "./birdsongServerName";
import { mcpSessionKeys } from "./mcpSessionKeys";

/** Birdsong's own MCP server for a session, served by the control server; none while it is down. */
export async function birdsongMcpServers(sessionId: string): Promise<acp.McpServer[]> {
  const endpoint = await liveControlEndpoint.get();
  if (!endpoint) return [];
  return [{
    type: "http",
    name: BIRDSONG_SERVER_NAME,
    url: `${endpoint.spec}mcp/${encodeURIComponent(sessionId)}`,
    headers: [{ name: "Authorization", value: `Bearer ${mcpSessionKeys.keyFor(sessionId)}` }],
  }];
}
