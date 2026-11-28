const SCALE: Record<string, number> = { "": 1, K: 1e3, M: 1e6, B: 1e9 };

/** "92.0K" → 92000, "1.5M" → 1500000, "115" → 115. */
export function parseCount(value: string): number {
  const match = /^([\d.,]+)([KMB]?)$/i.exec(value);
  if (!match) return 0;
  return Math.round(Number(match[1]!.replace(/,/g, "")) * (SCALE[match[2]!.toUpperCase()] ?? 1));
}
