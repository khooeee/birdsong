import { agentTurns } from "../../../shared/agentTurns";
import { questionPayload } from "../questionPayload";
import { spokenStatus } from "../spokenStatus";
import { turnSnapshot } from "../turnSnapshot";
import { voicedSession } from "../voicedSession";
import type { VoiceToolContext } from "../VoiceToolContext";

/** The session's status, current step, last result and any open question. */
export async function getStatusTool(ctx: VoiceToolContext): Promise<unknown> {
  const voiced = voicedSession(ctx);
  if (!voiced.ok) return voiced;
  const { session } = voiced;
  const turns = agentTurns(await ctx.sessions.getTranscript(session.id));
  const latest = turns.at(-1);
  const finished = turns.findLast((turn) => turn.status !== "running");
  const question = [...ctx.questions.values()].find((request) => request.sessionId === session.id);
  return {
    status: spokenStatus(session.status),
    ...(session.error ? { error: session.error } : {}),
    ...(latest?.status === "running" ? { current: turnSnapshot(latest) } : {}),
    ...(finished ? { lastResult: turnSnapshot(finished) } : {}),
    ...(question ? { question: questionPayload(question) } : {}),
    ...(turns.length ? {} : { note: "No prompts yet." }),
  };
}
