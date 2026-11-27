import type { Session } from "../../../shared/session";
import { toolArgs } from "../toolArgs";
import { voicedSession } from "../voicedSession";
import type { VoiceToolContext } from "../VoiceToolContext";

/** How a prompt lands: steering is only known once the agent has reported support. */
function delivery(session: Session): string {
  if (session.status !== "running") return "sent";
  if (session.supportsSteering === true) return "steered into the running turn";
  if (session.supportsSteering === false) return "queued behind the running turn";
  return "sent while it is working";
}

/** Send the user's instruction to the session (steers or queues when it is busy). */
export async function sendPromptTool(ctx: VoiceToolContext, args: Record<string, unknown>): Promise<unknown> {
  const text = toolArgs.string(args, "text");
  if (!text) return { ok: false, error: "text is required." };
  const voiced = voicedSession(ctx);
  if (!voiced.ok) return voiced;
  const landed = delivery(voiced.session);
  await ctx.sessions.enqueuePrompt(voiced.session.id, text);
  return { ok: true, delivery: landed };
}
