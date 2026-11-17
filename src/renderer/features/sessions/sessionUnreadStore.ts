let unread: ReadonlySet<string> = new Set();
const listeners = new Set<() => void>();

function set(sessionId: string, value: boolean): void {
  if (unread.has(sessionId) === value) return;
  const next = new Set(unread);
  if (value) next.add(sessionId);
  else next.delete(sessionId);
  unread = next;
  listeners.forEach((listener) => listener());
}

/** Unread dots shared by the session rail and command palette. */
export const sessionUnreadStore = {
  getSnapshot: () => unread,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  markUnread: (sessionId: string) => set(sessionId, true),
  markRead: (sessionId: string) => set(sessionId, false),
  toggle: (sessionId: string) => set(sessionId, !unread.has(sessionId)),
};
