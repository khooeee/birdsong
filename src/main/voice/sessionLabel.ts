import type { Session } from "../../shared/session";

/** First two non-empty title lines (folder + name), to speak. */
export function sessionLabel(session: Session): string {
  const lines = session.title.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 2);
  return lines.join(", ") || "Untitled";
}
