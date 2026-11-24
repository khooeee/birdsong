import { expandMcpServer } from "./expandMcpServer";
import { isHttpUrl } from "./isHttpUrl";
import type { McpServerEntry } from "./McpServerEntry";

/** Why sessions leave this server out, or null when they can connect to it. */
export function mcpServerProblem(server: McpServerEntry, env: NodeJS.ProcessEnv): string | null {
  const { server: expanded, missing } = expandMcpServer(server, env);
  if (missing.length) return `${server.name} is skipped: ${missing.join(", ")} not set in your shell`;
  if ("url" in expanded && !isHttpUrl(expanded.url)) {
    return `${server.name} is skipped: url must start with http:// or https://`;
  }
  return null;
}
