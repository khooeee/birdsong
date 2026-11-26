import { listReminders } from "../../reminders/listReminders";
import { localIsoTime } from "../../reminders/localIsoTime";
import { voicedSession } from "../voicedSession";
import type { VoiceToolContext } from "../VoiceToolContext";

/** The session's pending reminders, soonest first. */
export async function listRemindersTool(ctx: VoiceToolContext): Promise<unknown> {
  const voiced = voicedSession(ctx);
  if (!voiced.ok) return voiced;
  const { reminders, errors } = await listReminders();
  return {
    ok: true,
    now: localIsoTime(new Date()),
    reminders: reminders
      .filter((reminder) => reminder.sessionId === voiced.session.id)
      .map((reminder) => ({ id: reminder.id, due: reminder.dueAt, message: reminder.message })),
    ...(errors.length ? { errors } : {}),
  };
}
