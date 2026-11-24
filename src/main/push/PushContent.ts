/** What a push shows besides the badge; without an alert it only updates the badge. */
export type PushContent = {
  alert?: { title: string; body: string };
  /** Opened when the alert is tapped. */
  sessionId?: string;
};
