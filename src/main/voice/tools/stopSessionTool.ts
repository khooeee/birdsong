import { voicedSession } from "../voicedSession";
import type { VoiceToolContext } from "../VoiceToolContext";

/** Cancel the session's running turn; the session and its work stay. */
export async function stopSessionTool(ctx: VoiceToolContext): Promise<unknown> {
  const voiced = voicedSession(ctx);
  if (!voiced.ok) return voiced;
  if (voiced.session.status !== "running") return { ok: true, note: "It was not working." };
  await ctx.sessions.cancelPrompt(voiced.session.id);
  return { ok: true, stopped: true };
}
