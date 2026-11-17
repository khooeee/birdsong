/** `base` with each turn in `updates` replacing the turn with the same id, or appended. */
export function mergeTurnsById<T extends { id: string }>(base: T[], updates: T[]): T[] {
  if (!updates.length) return base;
  // Keep the first occurrence, matching the replacement behavior of findIndex.
  const indices = new Map<string, number>();
  base.forEach((turn, index) => {
    if (!indices.has(turn.id)) indices.set(turn.id, index);
  });
  let next = base;
  for (const turn of updates) {
    const index = indices.get(turn.id);
    if (index !== undefined && next[index] === turn) continue;
    if (next === base) next = base.slice();
    if (index !== undefined) next[index] = turn;
    else {
      indices.set(turn.id, next.length);
      next.push(turn);
    }
  }
  return next;
}
