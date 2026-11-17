/** Accept only session links with a safe on-disk folder id; pairing links are separate. */
export function sessionIdFromLink(link: string): string | null {
  return /^birdsong:\/\/session\/([a-z0-9_-]+)$/i.exec(link)?.[1] ?? null;
}
