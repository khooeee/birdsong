import type { KiloStats } from "./KiloStats";
import { parseCount } from "./parseCount";

const TOKEN_ROWS = new Set(["Input", "Output", "Cache Read", "Cache Write"]);

/** Reads the boxed text of `kilo stats --models`, which has no JSON form. */
export function parseKiloStats(text: string): KiloStats {
  const stats: KiloStats = { tokens: 0, cost: 0, models: [] };
  let section = "";
  let model: KiloStats["models"][number] | null = null;
  for (const raw of text.split("\n")) {
    const line = raw.replace(/[│┌┐└┘├┤─]/g, "").trim();
    if (!line) continue;
    const row = /^(.+?)\s{2,}(\S+)$/.exec(line);
    if (!row) {
      if (/^[A-Z &]+$/.test(line)) section = line;
      else if (section === "MODEL USAGE" && line.includes("/")) stats.models.push((model = { id: line, replies: 0 }));
      continue;
    }
    const label = row[1]!;
    const value = row[2]!;
    if (section === "COST & TOKENS" && TOKEN_ROWS.has(label)) stats.tokens += parseCount(value);
    else if (section === "COST & TOKENS" && label === "Total Cost") stats.cost = Number(value.replace("$", "")) || 0;
    else if (section === "MODEL USAGE" && label === "Messages" && model) model.replies = parseCount(value);
  }
  stats.models.sort((a, b) => b.replies - a.replies);
  return stats;
}
