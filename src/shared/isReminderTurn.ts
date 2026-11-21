import type { TranscriptItem, TranscriptTurn } from "./transcript";

/** A due reminder recorded in the transcript; never sent to the agent. */
export function isReminderTurn(turn: TranscriptTurn): turn is TranscriptTurn & { user: TranscriptItem & { role: "reminder" } } {
  return turn.user?.role === "reminder";
}
