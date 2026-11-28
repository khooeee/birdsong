/** One limit an agent enforces: how much of it is used and when it resets. */
export interface UsageMeter {
  label: string;
  /** 0–100, or null when the agent reports no percentage. */
  usedPercent: number | null;
  /** Epoch ms of the next reset, or null when unknown or not yet running. */
  resetsAt: number | null;
  /** Extra context, e.g. "$4.20 left". */
  detail?: string;
}
