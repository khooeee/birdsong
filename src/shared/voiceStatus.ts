/** Voice agent connection as the session's mic shows it. */
export interface VoiceStatus {
  state: "off" | "connecting" | "listening";
  /** What the voice agent is doing while connected. */
  activity: "idle" | "thinking" | "speaking";
  /** Last connection or setup failure; cleared on the next start. */
  error: string | null;
  /** Where the mic and speaker are: this window, or the iOS app (whoever started voice). */
  peer: "desktop" | "phone";
  /** The session voice belongs to (kept after it stops, so its mic can show the last error). */
  sessionId: string | null;
}
