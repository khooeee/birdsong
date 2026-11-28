import { isRecord } from "../../../shared/isRecord";
import { formatTokens } from "../formatTokens";

/** One line from `opencode stats --json`, e.g. "Last 7 days: 21 prompts · 150.3k tokens · $0.00". */
export function summarizeOpencodeStats(stats: unknown, days: number): string {
  if (!isRecord(stats)) throw new Error("OpenCode returned no stats");
  const tokens = isRecord(stats.tokens) ? stats.tokens : {};
  const cache = isRecord(tokens.cache) ? tokens.cache : {};
  const total = [tokens.input, tokens.output, tokens.reasoning, cache.read, cache.write]
    .reduce<number>((sum, value) => sum + (Number(value) || 0), 0);
  const prompts = Number(stats.prompts) || 0;
  const cost = Number(stats.cost) || 0;
  return `Last ${days} days: ${prompts} prompt${prompts === 1 ? "" : "s"} · ${formatTokens(total)} tokens · $${cost.toFixed(2)}`;
}
