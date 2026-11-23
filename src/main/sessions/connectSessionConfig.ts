import type { SessionConfigOptions } from "../acp/SessionConfigOptions";
import type { SessionDeps } from "./SessionDeps";

/** A session's agent config options (model, effort, ...), connecting its agent first if needed. */
export async function connectSessionConfig(
  { hydration, agents }: SessionDeps,
  sessionId: string,
): Promise<SessionConfigOptions> {
  const session = await hydration.ensure(sessionId);
  if (!session) throw new Error("No session");
  return (await agents.ensureSession(session)).config;
}
