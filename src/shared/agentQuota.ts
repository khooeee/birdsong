import type { AgentKind } from "./agentKind";

/** Agents whose subscription quota Birdsong can read. */
export type QuotaAgent = Extract<AgentKind, "claude" | "codex" | "cursor">;

/** One agent's binding usage limit: the window closest to running out. */
export interface AgentQuota {
  agent: QuotaAgent;
  /** 0–100 of the binding window. */
  usedPercent: number;
  /** When that window resets (epoch ms); null when it has not started. */
  resetsAt: number | null;
  /** "5-hour", "weekly" or "monthly". */
  window: string;
  /** When the numbers were read (epoch ms). */
  fetchedAt: number;
  /** Why the latest refresh failed; the numbers are from the last good one. */
  error?: string;
}
