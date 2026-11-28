import { isRecord } from "../../../shared/isRecord";
import { agentCli } from "../agentCli";
import { runUsageCommand } from "../runUsageCommand";
import type { UsageReading } from "../UsageReading";
import { parseClaudeUsage } from "./parseClaudeUsage";

/** Claude Code answers `/usage` in print mode without a model call. */
export async function readClaudeUsage(): Promise<UsageReading> {
  const out = await runUsageCommand(agentCli("claude"), ["-p", "/usage", "--output-format", "json", "--no-session-persistence"]);
  const parsed: unknown = JSON.parse(out);
  const text = isRecord(parsed) && typeof parsed.result === "string" ? parsed.result : "";
  const meters = parseClaudeUsage(text);
  if (meters.length) return { meters };
  return { meters, notes: [text.trim().split("\n")[0] || "Claude Code reported no usage limits"] };
}
