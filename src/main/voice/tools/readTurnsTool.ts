import { toolArgs } from "../toolArgs";
import { turnSnapshot } from "../turnSnapshot";
import { voicedSession } from "../voicedSession";
import type { VoiceToolContext } from "../VoiceToolContext";

/** The session's last few prompt/reply pairs in full, oldest first. */
export async function readTurnsTool(ctx: VoiceToolContext, args: Record<string, unknown>): Promise<unknown> {
  const voiced = voicedSession(ctx);
  if (!voiced.ok) return voiced;
  const count = Math.min(10, Math.max(1, Math.round(toolArgs.number(args, "count") ?? 3)));
  const turns = await ctx.sessions.getTranscript(voiced.session.id);
  return { turns: turns.slice(-count).map((turn) => turnSnapshot(turn)) };
}
