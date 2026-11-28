const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function duration(ms: number): string {
  const days = Math.floor(ms / DAY_MS);
  const hours = Math.floor((ms % DAY_MS) / HOUR_MS);
  const minutes = Math.ceil((ms % HOUR_MS) / MINUTE_MS) % 60;
  if (days) return hours ? `${days}d ${hours}h` : `${days}d`;
  if (hours) return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${Math.max(1, Math.ceil(ms / MINUTE_MS))}m`;
}

/** "resets in 2h 13m (Fri 3:00 PM)" for a reset time, or "" when there is none. */
export function formatReset(resetsAt: number | null, now = Date.now()): string {
  if (resetsAt === null) return "";
  const left = resetsAt - now;
  if (left <= 0) return "resets now";
  const when = new Date(resetsAt).toLocaleString(undefined, {
    weekday: "short",
    ...(left > 6 * DAY_MS ? { month: "short", day: "numeric" } : {}),
    hour: "numeric",
    minute: "2-digit",
  });
  return `resets in ${duration(left)} (${when})`;
}
