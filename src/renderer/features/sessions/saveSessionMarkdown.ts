import type { Session } from "../../../shared/session";
import { firstLine } from "./firstLine";
import { sessionMarkdown } from "./sessionMarkdown";

/** Loads a session's transcript and opens a save dialog for it as markdown. */
export async function saveSessionMarkdown(session: Session): Promise<void> {
  const turns = await window.birdsong.getTranscript(session.id);
  await window.birdsong.saveMarkdown(sessionMarkdown(session, turns), firstLine(session.title));
}
