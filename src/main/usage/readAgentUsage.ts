import type { AgentKind } from "../../shared/agentKind";
import { AGENT_LABELS } from "../../shared/agentLabels";
import type { AgentUsage } from "../../shared/agentUsage";
import { errorMessage } from "../../shared/errorMessage";
import { USAGE_PAGES } from "../../shared/usagePages";
import { USAGE_READERS } from "./usageReaders";

/**
 * Reads one agent's usage now, with no cache. A failed read resolves with `error` so the
 * agent keeps its row; undefined means Birdsong shows no usage for that agent.
 */
export async function readAgentUsage(kind: AgentKind): Promise<AgentUsage | undefined> {
  const base = { agent: kind, name: AGENT_LABELS[kind], meters: [], notes: [] };
  const page = USAGE_PAGES[kind];
  if (page) return { ...base, page };
  const read = USAGE_READERS[kind];
  if (!read) return undefined;
  try {
    const { plan, meters, notes = [] } = await read();
    return { ...base, plan, meters, notes };
  } catch (error) {
    return { ...base, error: errorMessage(error) };
  }
}
