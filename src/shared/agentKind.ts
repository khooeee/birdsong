/** New Session picker order: alphabetical by display name, so `vibe` (Mistral Vibe) sits before `opencode`. */
export const AGENT_KINDS = ["antigravity", "claude", "codex", "copilot", "cursor", "devin", "kilo", "vibe", "opencode", "pi"] as const;

export type AgentKind = (typeof AGENT_KINDS)[number];

const KNOWN = new Set<string>(AGENT_KINDS);

export function isAgentKind(value: unknown): value is AgentKind {
  return typeof value === "string" && KNOWN.has(value);
}
