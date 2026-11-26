import type { McpProblem } from "../../../shared/mcpProblem";
import { expandMcpServer } from "./expandMcpServer";
import { isHttpUrl } from "./isHttpUrl";
import type { McpServerEntry } from "./McpServerEntry";

/** Why sessions leave this server out, or null when they can connect to it. */
export function mcpServerProblem(server: McpServerEntry, env: NodeJS.ProcessEnv): McpProblem | null {
  const { server: expanded, missing } = expandMcpServer(server, env);
  const skipped = (reason: string): McpProblem => ({ server: server.name, message: `skipped: ${reason}` });
  if (missing.length) return skipped(`${missing.join(", ")} not set in your shell`);
  if ("url" in expanded && !isHttpUrl(expanded.url)) return skipped("url must start with http:// or https://");
  return null;
}
