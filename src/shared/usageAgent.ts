import type { AgentKind } from "./agentKind";

/** An agent the Usage window shows, with its display name so clients can label it before its read lands. */
export interface UsageAgent {
  agent: AgentKind;
  name: string;
}
