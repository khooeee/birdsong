import * as path from "node:path";
import { AGENT_LABELS } from "../../shared/agentLabels";
import type { AppSettings } from "../../shared/appSettings";
import type { Session } from "../../shared/session";
import template from "./voiceInstructions.md?raw";
import { sessionLabel } from "./sessionLabel";

/** The voice agent's system prompt for one session, with the user's language and the local time. */
export function voiceInstructions(settings: AppSettings, session: Session): string {
  const now = new Date().toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" });
  const filled = template
    .replaceAll("{{language}}", settings.voiceLanguage)
    .replaceAll("{{session}}", sessionLabel(session))
    .replaceAll("{{project}}", path.basename(session.cwd))
    .replaceAll("{{agent}}", AGENT_LABELS[session.agent]);
  return `${filled}\n\nThe current local date and time is ${now}.`;
}
