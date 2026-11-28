import type { AgentKind } from "./agentKind";
import type { UsageMeter } from "./usageMeter";
import type { UsagePage } from "./usagePage";

/** One agent's usage and limits, read on request; a failed read keeps the row with `error`. */
export interface AgentUsage {
  agent: AgentKind;
  /** Display name, so clients need not know every agent. */
  name: string;
  plan?: string;
  meters: UsageMeter[];
  /** Usage that is not a limit, or where the limits live instead. */
  notes: string[];
  /** Set instead of meters for agents whose usage lives on their website. */
  page?: UsagePage;
  error?: string;
}
