/** "plus" → "Plus", "free_limited" → "Free Limited". */
export function titleCase(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
