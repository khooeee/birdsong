import type { Reminder } from "../../shared/reminder";
import { updateReminders } from "./updateReminders";

/** Remove a pending reminder (only one linked to `sessionId`, when given); returns it, or undefined when none matches. */
export function cancelReminder(id: string, sessionId?: string): Promise<Reminder | undefined> {
  return updateReminders((reminders) => {
    const match = reminders.find((reminder) => reminder.id === id && (!sessionId || reminder.sessionId === sessionId));
    return [match ? reminders.filter((reminder) => reminder !== match) : reminders, match];
  });
}
