import * as path from "node:path";
import type { TranscriptTurn } from "../../shared/transcript";
import { isReminderTurn } from "../../shared/isReminderTurn";

/** What a running turn is doing right now: its latest tool call or assistant text. */
function currentStep(turn: TranscriptTurn): string {
  for (let i = turn.events.length - 1; i >= 0; i--) {
    const event = turn.events[i]!;
    if (event.role === "tool") return event.toolTitle ?? event.text;
    if (event.role === "assistant" && event.text.trim()) return event.text.trim();
  }
  return turn.assistant?.text.trim() || "thinking";
}

/** Speakable view of one turn, in full: its prompt, then its current step or its final message and changed files. */
export function turnSnapshot(turn: TranscriptTurn) {
  if (isReminderTurn(turn)) return { reminder: turn.user.text };
  const prompt = turn.user?.text ?? null;
  const files = [...new Set(turn.fileChanges.map((change) => path.basename(change.path)))];
  if (turn.status === "running") {
    return {
      status: "working",
      prompt,
      now: currentStep(turn),
      minutes: Math.max(0, Math.round((Date.now() - turn.at) / 60_000)),
    };
  }
  return {
    status: turn.status,
    prompt,
    reply: turn.assistant?.text.trim() || "(no reply)",
    ...(files.length ? { files } : {}),
  };
}
