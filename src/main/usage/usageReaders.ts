import type { AgentKind } from "../../shared/agentKind";
import { readAntigravityUsage } from "./antigravity/readAntigravityUsage";
import { readClaudeUsage } from "./claude/readClaudeUsage";
import { readCodexUsage } from "./codex/readCodexUsage";
import { readKiloUsage } from "./kilo/readKiloUsage";
import { readOpencodeUsage } from "./opencode/readOpencodeUsage";
import type { UsageReading } from "./UsageReading";

/** Agents that report their own usage through their CLI, without Birdsong touching credentials. */
export const USAGE_READERS: Partial<Record<AgentKind, () => Promise<UsageReading>>> = {
  antigravity: readAntigravityUsage,
  claude: readClaudeUsage,
  codex: readCodexUsage,
  kilo: readKiloUsage,
  opencode: readOpencodeUsage,
};
