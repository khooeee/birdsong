/** "5h", "Weekly" or "Daily" for a limit window given in minutes. */
export function windowLabel(minutes: number): string {
  if (minutes === 10_080) return "Weekly";
  if (minutes === 1_440) return "Daily";
  if (minutes % 1_440 === 0) return `${minutes / 1_440}d`;
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  return `${minutes}m`;
}
