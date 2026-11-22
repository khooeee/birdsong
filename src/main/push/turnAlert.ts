import { clipText } from "../../shared/clipText";
import type { Session } from "../../shared/session";
import type { TranscriptTurn } from "../../shared/transcript";

/** Banner for a finished turn: the session's first title line, and the reply clipped short. */
export function turnAlert(session: Session, turn: TranscriptTurn | undefined): { title: string; body: string } {
  const line = session.title.split("\n").find((item) => item.trim()) ?? "Birdsong";
  const reply = clipText(turn?.assistant?.text ?? "", 120);
  return { title: clipText(line, 120), body: reply || "Finished" };
}
