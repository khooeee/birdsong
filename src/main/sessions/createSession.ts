import { loadWorkingFolders } from "../workingFolders/loadWorkingFolders";
import { clipText } from "../../shared/clipText";
import type { CreateSessionInput } from "../../shared/createSessionInput";
import { errorMessage } from "../../shared/errorMessage";
import { folderTitle } from "../../shared/folderTitle";
import type { Session } from "../../shared/session";
import { newSessionId } from "./newSessionId";
import type { SessionDeps } from "./SessionDeps";
import { setSessionStatus } from "./setSessionStatus";

/**
 * Add a new session to the rail and connect it, preferring a warm agent. A `home` session becomes Home
 * before the rail first shows it, and leaves the warm agents in the folder new sessions use.
 */
export async function createSession(
  { state, persistence, agents }: SessionDeps,
  input: CreateSessionInput,
  focus: boolean,
  home = false,
): Promise<Session> {
  const workingFolders = await loadWorkingFolders(undefined, input.cwd);
  const draft = input.draftId ? agents.draft.claim(input.draftId, input.agent, input.cwd) : null;
  const warm = draft ? null : state.warm.take(input.agent, input.cwd);
  const id = draft?.id ?? warm?.acp.id ?? newSessionId();
  const title = input.title ?? folderTitle(
    input.cwd,
    input.prompt ? clipText(input.prompt, 60) : "",
    input.agent,
  );
  const session: Session = {
    id,
    title,
    agent: input.agent,
    cwd: input.cwd,
    workingFolders,
    agentSessionId: null,
    status: "connecting",
    error: null,
    createdAt: Date.now(),
    cron: input.cron || undefined,
    autoTitle: input.autoTitle || undefined,
  };
  if (home) state.homeId = id;
  state.prependSession(session, input.pin === true);
  state.transcripts.set(id, []);
  state.hydrated.add(id);
  if (focus) state.activeTabId = id;
  state.emitSessions();

  try {
    const claimed = draft ?? (warm && (await warm.started) ? warm.acp : null);
    const acp = claimed ?? agents.openSession(session);
    state.agents.set(id, acp);
    if (claimed) {
      claimed.adopt(agents.callbacksFor(session));
      session.agentSessionId = claimed.sessionId;
      setSessionStatus(state, id, "ready", null);
    } else {
      await acp.start();
      session.agentSessionId = acp.sessionId;
      state.emitSessions();
    }
  } catch (err) {
    setSessionStatus(state, id, "error", errorMessage(err));
  }

  if (!home) agents.ensureWarm(input.cwd);
  void persistence.persist();
  return session;
}
