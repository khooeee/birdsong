/** One voice from the Inworld workspace's catalog: a system voice or one the workspace cloned or designed. */
export interface InworldVoice {
  /** Passed unchanged as the realtime session's `audio.output.voice`. */
  voiceId: string;
  displayName: string;
  description: string;
  /** `male`, `female`, `neutral`, or empty. */
  gender: string;
  /** BCP-47, e.g. `en-US`; empty when Inworld omits it. */
  languageCode: string;
  /** `SYSTEM` for Inworld's voices; anything else is the workspace's own. */
  source: string;
}
