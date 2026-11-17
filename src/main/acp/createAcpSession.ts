import * as acp from "@agentclientprotocol/sdk/unstable";

/** Allocate an agent session with the Birdsong session's MCP servers. */
export function createAcpSession(
  connection: acp.ClientConnection,
  cwd: string,
  mcpServers: acp.McpServer[],
): Promise<acp.NewSessionResponse> {
  return connection.agent.request(acp.methods.agent.session.new, { cwd, mcpServers });
}
