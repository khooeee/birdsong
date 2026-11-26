import type { AgentKind } from "../../shared/agentKind";
import { continueTitle } from "../../shared/continueTitle";
import type { Session } from "../../shared/session";
import type { SessionManager } from "./SessionManager";
import { resumeHandoffPrompt } from "./resumeHandoffPrompt";

/** Open a session with another agent in the source's folders and ask it to continue the source's work. */
export async function continueSession(
  sessions: SessionManager,
  sourceId: string,
  agent: AgentKind,
  { pin, focus }: { pin: boolean; focus: boolean },
): Promise<Session> {
  const source = sessions.getSession(sourceId);
  if (!source) throw new Error("Session not found");
  if (!source.cwd.trim()) throw new Error("The session has no folder to continue in");
  const title = continueTitle(source.title, agent);
  const session = await sessions.createSession({ agent, cwd: source.cwd, title, pin }, { focus });
  if (session.status === "error") return session;
  for (const folder of source.workingFolders) {
    await sessions.workingFolders.add(session.id, folder.path).catch(console.error);
  }
  await sessions.enqueuePrompt(session.id, resumeHandoffPrompt(source));
  return session;
}
