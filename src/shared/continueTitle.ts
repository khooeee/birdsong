import { AGENT_LABELS } from "./agentLabels";
import { type AgentKind, isAgentKind } from "./agentKind";

const LABELS = new Set<string>(Object.values(AGENT_LABELS));

/** When the title's first line ends with an agent, name the agent that is taking over. */
export function continueTitle(title: string, agent: AgentKind): string {
  const breakAt = title.indexOf("\n");
  const first = breakAt === -1 ? title : title.slice(0, breakAt);
  const rest = breakAt === -1 ? "" : title.slice(breakAt);
  const match = /^(.*) \(([^)]+)\)$/.exec(first);
  if (!match) return title;
  const current = match[2];
  if (!isAgentKind(current) && !LABELS.has(current)) return title;
  return `${match[1]} (${agent})${rest}`;
}
