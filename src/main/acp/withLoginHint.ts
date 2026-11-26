import type { AgentKind } from "../../shared/agentKind";
import { isAuthRequired } from "./isAuthRequired";
import { AGENT_PRESETS } from "./presets";

/** The agent's sign-in instructions in place of a bare "Authentication required" error. */
export function withLoginHint(agent: AgentKind, error: unknown): unknown {
  const hint = AGENT_PRESETS[agent].loginHint;
  return hint && isAuthRequired(error) ? new Error(hint) : error;
}
