/** "at 3:05 PM", with the weekday when that is not today. */
export function formatResumeTime(resumeAt: number): string {
  const date = new Date(resumeAt);
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (date.toDateString() === new Date().toDateString()) return `at ${time}`;
  return `${date.toLocaleDateString(undefined, { weekday: "long" })} at ${time}`;
}
