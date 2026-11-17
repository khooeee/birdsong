import { fuzzyMatch } from "../goToFile/fuzzyMatch";
import type { PaletteCommand } from "./PaletteCommand";
import type { RankedCommand } from "./RankedCommand";

const NO_POSITIONS: readonly number[] = [];

/** Prefer command names over aliases; preserve definition order for ties and an empty query. */
export function rankCommands(commands: readonly PaletteCommand[], query: string): RankedCommand[] {
  const needle = query.replace(/\s+/g, "").toLowerCase();
  if (!needle) return commands.map((command) => ({ command, positions: NO_POSITIONS }));
  const hits: Array<RankedCommand & { score: number }> = [];
  for (const command of commands) {
    const match = fuzzyMatch(command.label, command.label.toLowerCase(), needle);
    const aliases = command.aliases ?? "";
    const hit = match ?? fuzzyMatch(aliases, aliases.toLowerCase(), needle);
    if (!hit) continue;
    hits.push({ command, positions: match?.positions ?? NO_POSITIONS,
      score: hit.score + (match ? 1000 : 0) });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits;
}
