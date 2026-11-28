import { agentCli } from "../agentCli";
import { runUsageCommand } from "../runUsageCommand";
import type { UsageReading } from "../UsageReading";
import { parseAgyQuota } from "./parseAgyQuota";

/** The Antigravity CLI answers `/quota` in print mode without a model call. */
export async function readAntigravityUsage(): Promise<UsageReading> {
  const out = await runUsageCommand(agentCli("antigravity"), ["-p", "/quota", "--print-timeout", "40s"]);
  const meters = parseAgyQuota(out);
  if (!meters.length) throw new Error(out.trim().split("\n")[0] || "Antigravity reported no quota");
  return { meters };
}
