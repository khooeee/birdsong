let tag: { sessionId: string; session: string } | null = null;

/** The session voice is on, stamped on every voice log entry so the log shows whose conversation it was. */
export const voiceLogSession = {
  set(sessionId: string, label: string): void {
    tag = { sessionId, session: label };
  },

  clear(): void {
    tag = null;
  },

  get(): { sessionId: string; session: string } | null {
    return tag;
  },
};
