/** A local desktop link to a session, independent of its title or rail position. */
export function sessionLink(sessionId: string): string {
  return `birdsong://session/${encodeURIComponent(sessionId)}`;
}
