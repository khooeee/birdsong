import type { RankedCommand } from "./RankedCommand";

/** Wrap through executable results, leaving unavailable commands visible but unselected. */
export function nextCommandId(results: readonly RankedCommand[], selectedId: string | null, delta: number): string | null {
  const enabled = results.filter(({ command }) => !command.disabled);
  if (!enabled.length) return null;
  const index = enabled.findIndex(({ command }) => command.id === selectedId);
  if (index < 0) return enabled[delta < 0 ? enabled.length - 1 : 0].command.id;
  return enabled[(index + delta + enabled.length) % enabled.length].command.id;
}
