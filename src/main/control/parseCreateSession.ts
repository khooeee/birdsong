import { AGENT_KINDS, isAgentKind } from "../../shared/agentKind";
import type { CreateSessionInput } from "../../shared/createSessionInput";
import { orList } from "../../shared/orList";

/** Validate a POST /sessions body. */
export function parseCreateSession(body: Record<string, unknown>): CreateSessionInput {
  const agent = body.agent;
  if (!isAgentKind(agent)) {
    throw new Error(`agent must be ${orList(AGENT_KINDS)}`);
  }
  const cwd = body.cwd;
  if (typeof cwd !== "string" || !cwd.trim()) throw new Error("cwd is required");
  const title = typeof body.title === "string" ? body.title : undefined;
  const pin = body.pin === true;
  return { agent, cwd, title, pin };
}
