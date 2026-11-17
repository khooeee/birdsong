import type { Session } from "../../shared/session";
import type { SessionMeta } from "./sessionMeta";

export function metaFromSession(session: Session): SessionMeta {
  return {
    title: session.title,
    agent: session.agent,
    cwd: session.cwd,
    workingFolders: session.workingFolders,
    agentSessionId: session.agentSessionId,
    usage: session.usage,
    modelConfig: session.modelConfig,
    cron: session.cron,
    autoTitle: session.autoTitle,
    resumeAt: session.resumeAt,
  };
}
