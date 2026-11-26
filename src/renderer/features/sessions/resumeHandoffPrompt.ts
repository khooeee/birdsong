/** First prompt for a session that should continue another's work. */
export function resumeHandoffPrompt(session: { id: string; title: string }): string {
  const title = session.title.replace(/\s+/g, " ").trim();
  return `Take over Birdsong session "${title}" (id: ${session.id}). Read its transcript, then continue the work from where it stopped.`;
}
