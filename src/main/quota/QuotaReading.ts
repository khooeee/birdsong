import type { AgentQuota } from "../../shared/agentQuota";

/** What a provider reports for its binding window, before Birdsong tags it with agent and time. */
export type QuotaReading = Pick<AgentQuota, "usedPercent" | "resetsAt" | "window">;
