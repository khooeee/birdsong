export const AGENT_KINDS = ["antigravity", "claude", "codex", "cursor", "devin", "pi"] as const;

export type AgentKind = (typeof AGENT_KINDS)[number];

const KNOWN = new Set<string>(AGENT_KINDS);

export function isAgentKind(value: unknown): value is AgentKind {
  return typeof value === "string" && KNOWN.has(value);
}
