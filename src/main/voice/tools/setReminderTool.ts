import { addReminder } from "../../reminders/addReminder";
import { localIsoTime } from "../../reminders/localIsoTime";
import { resolveDueAt } from "../../reminders/resolveDueAt";
import { toolArgs } from "../toolArgs";
import { voicedSession } from "../voicedSession";
import type { VoiceToolContext } from "../VoiceToolContext";

/** Set a reminder linked to the session, so clicking it opens the session. */
export async function setReminderTool(ctx: VoiceToolContext, args: Record<string, unknown>): Promise<unknown> {
  const message = toolArgs.string(args, "message");
  if (!message) return { ok: false, error: "Give the reminder message." };
  const voiced = voicedSession(ctx);
  if (!voiced.ok) return voiced;
  const due = localIsoTime(resolveDueAt(toolArgs.string(args, "at"), toolArgs.number(args, "minutes")));
  const reminder = await addReminder({ message, at: due, sessionId: voiced.session.id });
  return { ok: true, id: reminder.id, due, now: localIsoTime(new Date()), message };
}
