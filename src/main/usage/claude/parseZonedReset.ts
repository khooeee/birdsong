const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
const PATTERN =
  /^(?:([a-z]{3})[a-z]*\s+(\d{1,2})(?:,\s*(\d{4}))?\s+at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*\(([^)]+)\)$/i;

/**
 * Epoch ms for Claude's reset text, e.g. "Nov 27 at 3pm (America/Los_Angeles)" or "3:30pm (UTC)".
 * Returns null for anything else, including an unknown time zone.
 */
export function parseZonedReset(text: string, now = Date.now()): number | null {
  const match = PATTERN.exec(text.trim());
  if (!match) return null;
  const [, monthName, day, year, hour, minute = "0", meridiem, timeZone] = match;
  const hours = (Number(hour) % 12) + (meridiem.toLowerCase() === "pm" ? 12 : 0);
  const month = monthName ? MONTHS.indexOf(monthName.toLowerCase()) : -1;
  if (monthName && month < 0) return null;
  try {
    const today = wallClock(now, timeZone);
    const wall = Date.UTC(
      year ? Number(year) : today.year,
      monthName ? month : today.month,
      monthName ? Number(day) : today.day,
      hours,
      Number(minute),
    );
    const at = toInstant(wall, timeZone);
    // A bare time already past today means tomorrow; a past date without a year means next year.
    if (!monthName && at < now - MINUTE_MS) return toInstant(wall + DAY_MS, timeZone);
    if (monthName && !year && at < now - DAY_MS) return toInstant(addYear(wall), timeZone);
    return at;
  } catch {
    return null;
  }
}

type WallClock = { year: number; month: number; day: number; asUtc: number };

function wallClock(time: number, timeZone: string): WallClock {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone, year: "numeric", month: "numeric", day: "numeric",
      hour: "numeric", minute: "numeric", hourCycle: "h23",
    }).formatToParts(time).map((part) => [part.type, Number(part.value)]),
  );
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  return { year: parts.year, month: parts.month - 1, day: parts.day, asUtc };
}

/** The instant whose wall clock in `timeZone` reads `wall` (a wall time encoded as UTC). */
function toInstant(wall: number, timeZone: string): number {
  let at = wall;
  // Two passes settle the offset, including across a DST change.
  for (let pass = 0; pass < 2; pass++) at = wall - (wallClock(at, timeZone).asUtc - at);
  return at;
}

function addYear(wall: number): number {
  const date = new Date(wall);
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date.getTime();
}
