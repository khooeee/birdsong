/** Colour band for a quota: amber from 80%, red once it is used up. */
export function quotaLevel(usedPercent: number): "ok" | "warn" | "full" {
  if (usedPercent >= 100) return "full";
  if (usedPercent >= 80) return "warn";
  return "ok";
}
