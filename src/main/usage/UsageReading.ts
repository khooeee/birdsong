import type { UsageMeter } from "../../shared/usageMeter";

/** What one agent's own CLI reported about its account. */
export interface UsageReading {
  plan?: string;
  meters: UsageMeter[];
  notes?: string[];
}
