import type { AppSettings } from "../../shared/appSettings";
import type { Session } from "../../shared/session";
import { voiceInstructions } from "./voiceInstructions";

/** `session.update` that only swaps the instructions, after the session was renamed mid-call. */
export function voiceInstructionsUpdate(settings: AppSettings, session: Session) {
  return { type: "session.update", session: { type: "realtime", instructions: voiceInstructions(settings, session) } };
}
