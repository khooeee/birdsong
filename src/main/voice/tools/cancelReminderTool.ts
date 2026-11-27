import { cancelReminder } from "../../reminders/cancelReminder";
import { toolArgs } from "../toolArgs";
import { voicedSession } from "../voicedSession";
import type { VoiceToolContext } from "../VoiceToolContext";

/** Cancel one of the session's pending reminders by the id list_reminders gave. */
export async function cancelReminderTool(ctx: VoiceToolContext, args: Record<string, unknown>): Promise<unknown> {
  const id = toolArgs.string(args, "id");
  if (!id) return { ok: false, error: "Give the reminder id from list_reminders." };
  const voiced = voicedSession(ctx);
  if (!voiced.ok) return voiced;
  const cancelled = await cancelReminder(id, voiced.session.id);
  return cancelled ? { ok: true, cancelled: cancelled.message } : { ok: false, error: "This session has no pending reminder with that id." };
}
