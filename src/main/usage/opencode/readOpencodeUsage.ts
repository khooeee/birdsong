import { agentCli } from "../agentCli";
import { runUsageCommand } from "../runUsageCommand";
import type { UsageReading } from "../UsageReading";
import { summarizeOpencodeStats } from "./summarizeOpencodeStats";

const DAYS = 7;

/** OpenCode has no account quota of its own; its limits belong to whichever provider it signs in to. */
export async function readOpencodeUsage(): Promise<UsageReading> {
  const stats: unknown = JSON.parse(await runUsageCommand(agentCli("opencode"), ["stats", "--json", "--days", String(DAYS)]));
  return { meters: [], notes: [summarizeOpencodeStats(stats, DAYS), "Limits belong to the providers it signs in to"] };
}
