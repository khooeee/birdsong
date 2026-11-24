import type * as acp from "@agentclientprotocol/sdk/unstable";
import type { McpServerEntry } from "./McpServerEntry";

function pairs(record: Record<string, string>): { name: string; value: string }[] {
  return Object.entries(record).map(([name, value]) => ({ name, value }));
}

export function toAcpMcpServer(server: McpServerEntry): acp.McpServer {
  return "url" in server
    ? { type: "http", name: server.name, url: server.url, headers: pairs(server.headers) }
    : { name: server.name, command: server.command, args: server.args, env: pairs(server.env) };
}
