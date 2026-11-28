import type { AgentKind } from "../../shared/agentKind";
import { AGENT_PRESETS } from "../acp/presets";

/** The agent's own CLI: the one its ACP adapter shells out to, or the adapter itself. */
export function agentCli(kind: AgentKind): string {
  const preset = AGENT_PRESETS[kind];
  return preset.requiredCommand ?? preset.command;
}
