import { agentCli } from "../agentCli";
import { formatTokens } from "../formatTokens";
import { runUsageCommand } from "../runUsageCommand";
import type { UsageReading } from "../UsageReading";
import { parseKiloProfile } from "./parseKiloProfile";
import { parseKiloStats } from "./parseKiloStats";

const DAYS = 7;
const QUIET = ["--log-level", "ERROR"];

async function readAccount(): Promise<UsageReading> {
  try {
    return parseKiloProfile(JSON.parse(await runUsageCommand(agentCli("kilo"), ["profile", "--json", ...QUIET])));
  } catch (error) {
    if (!(error instanceof Error && /not authenticated/i.test(error.message))) throw error;
    return { plan: "Free", meters: [], notes: ["Not signed in to Kilo Gateway; Kilo reports no limits for its free models"] };
  }
}

/** Usage is context, so a stats failure leaves it out rather than failing the row. */
async function readRecentUse(): Promise<string[]> {
  try {
    const stats = parseKiloStats(await runUsageCommand(agentCli("kilo"), ["stats", "--days", String(DAYS), "--models", ...QUIET]));
    const notes = [`Last ${DAYS} days: ${formatTokens(stats.tokens)} tokens · $${stats.cost.toFixed(2)}`];
    const models = stats.models.map((m) => `${m.id} (${m.replies} ${m.replies === 1 ? "reply" : "replies"})`);
    if (models.length) notes.push(`Models: ${models.join(", ")}`);
    return notes;
  } catch {
    return [];
  }
}

/**
 * Kilo's own `profile --json` reports the Kilo Gateway credit balance, and `stats` shows which models it used.
 * Signed out, Kilo still runs the Gateway's free models anonymously, and reports no limits for them.
 */
export async function readKiloUsage(): Promise<UsageReading> {
  const [account, recent] = await Promise.all([readAccount(), readRecentUse()]);
  return { ...account, notes: [...(account.notes ?? []), ...recent] };
}
