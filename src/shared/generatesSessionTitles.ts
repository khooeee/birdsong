import type { AgentKind } from "./agentKind";

/** Pi only names a session on `/name`; OpenCode never sends its title over ACP. */
const UNTITLED = new Set<AgentKind>(["opencode", "pi"]);

/** Agents that title a session from its first prompt (ACP `session_info_update`). */
export function generatesSessionTitles(agent: AgentKind | undefined): boolean {
  return agent !== undefined && !UNTITLED.has(agent);
}
