const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** Claude sometimes reports the session reset only as local clock time in its error text. */
export function claudeSessionLimitResetAt(message: string, now: number): number | null {
  const match = /^(?:Internal error:\s*)?You've hit your session limit\s*·\s*resets (\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*\(([^)]+)\)\s*$/iu.exec(message);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  if (hour < 1 || hour > 12 || minute > 59) return null;
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: match[4], year: "numeric", month: "numeric", day: "numeric",
      hour: "numeric", minute: "numeric", hourCycle: "h23",
    });
    // Represent the displayed wall clock as UTC so offset arithmetic stays independent of the host's zone.
    const wallTime = (time: number): number => {
      const parts = Object.fromEntries(formatter.formatToParts(time).map((part) => [part.type, part.value]));
      return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    };
    const today = new Date(wallTime(now));
    today.setUTCHours(hour % 12 + (match[3].toLowerCase() === "pm" ? 12 : 0), minute, 0, 0);
    for (let day = 0; day < 3; day++) {
      const target = today.getTime() + day * DAY_MS;
      // Sample both sides of a DST change; verify each candidate against the requested wall clock.
      const candidates = [-DAY_MS, 0, DAY_MS].map((shift) => {
        const sample = target + shift;
        return target - (wallTime(sample) - sample);
      }).filter((time) => wallTime(time) === target && time >= now - MINUTE_MS);
      if (candidates.length) return Math.min(...candidates);
    }
  } catch {
    // An unknown time zone must not turn a quota error into a scheduling error.
  }
  return null;
}
