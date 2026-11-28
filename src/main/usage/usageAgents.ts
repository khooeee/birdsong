import { AGENT_KINDS } from "../../shared/agentKind";
import { AGENT_LABELS } from "../../shared/agentLabels";
import type { UsageAgent } from "../../shared/usageAgent";
import { USAGE_PAGES } from "../../shared/usagePages";
import { availableAgents } from "../acp/availableAgents";
import { USAGE_READERS } from "./usageReaders";

/** Installed agents with usage to show: ones Birdsong reads first, then ones that link to a web page. */
export async function usageAgents(): Promise<UsageAgent[]> {
  const installed = new Set(await availableAgents());
  const shown = (table: object) => AGENT_KINDS.filter((kind) => installed.has(kind) && kind in table);
  return [...shown(USAGE_READERS), ...shown(USAGE_PAGES)].map((agent) => ({ agent, name: AGENT_LABELS[agent] }));
}
