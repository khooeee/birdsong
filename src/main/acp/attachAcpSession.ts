import * as acp from "@agentclientprotocol/sdk/unstable";
import { formatAgentError } from "../../shared/formatAgentError";
import { isAuthRequired } from "./isAuthRequired";

type AttachHost = {
  connection: acp.ClientConnection | null;
  canLoad: boolean;
  canResume: boolean;
  /** Claude v1 resume attaches without replay; load has an explicit replay end update. */
  resumesWithoutReplay: boolean;
  cwd: string;
  /** Agents connect MCP servers per load/resume, so they go with every attach. */
  mcpServers: acp.McpServer[];
  turnCount: () => number;
  setMirrorUpdates: (value: boolean) => void;
  /** No turn running; remote turn status unknown. */
  markIdle: () => void;
  setSessionId: (sessionId: string) => void;
  clearSessionId: () => void;
  resetOutput: () => void;
  onReady: () => void;
  onConfigOptions: (options: acp.SessionConfigOption[] | null | undefined) => Promise<void>;
  createAgentSession: () => Promise<void>;
};

/** Resume/load an existing agent session, or mint a fresh one when hollow. */
export async function attachAcpSession(
  host: AttachHost,
  sessionId: string,
): Promise<void> {
  if (!host.connection) throw new Error("Session closed");
  // Never-prompted sessions often have an agent id / session-env but no
  // transcript. Resuming them yields a hollow session that completes with no
  // assistant text. Mint a fresh agent session instead.
  if (host.turnCount() === 0) {
    host.setMirrorUpdates(true);
    await host.createAgentSession();
    return;
  }
  const params = { sessionId, cwd: host.cwd, mcpServers: host.mcpServers };
  // Prefer load: older agents (incl. Cursor) advertise loadSession, not session/resume.
  const methods: Array<typeof acp.methods.agent.session.load | typeof acp.methods.agent.session.resume> = [];
  if (host.canLoad) methods.push(acp.methods.agent.session.load);
  if (host.canResume) methods.push(acp.methods.agent.session.resume);
  if (methods.length === 0) {
    methods.push(acp.methods.agent.session.load, acp.methods.agent.session.resume);
  }
  const errors: string[] = [];
  for (const method of methods) {
    let configOptions: acp.SessionConfigOption[] | null | undefined;
    try {
      host.setSessionId(sessionId);
      host.setMirrorUpdates(host.resumesWithoutReplay && method === acp.methods.agent.session.resume);
      host.markIdle();
      host.resetOutput();
      const response = await host.connection.agent.request(method, params) as {
        sessionId?: string;
        configOptions?: acp.SessionConfigOption[] | null;
      } | void;
      const resumedId =
        response && typeof response === "object" && typeof response.sessionId === "string"
          ? response.sessionId
          : sessionId;
      host.setSessionId(resumedId);
      configOptions = response?.configOptions;
    } catch (err) {
      host.clearSessionId();
      host.markIdle();
      // Signed out: another method or a fresh session would fail the same way.
      if (isAuthRequired(err)) throw err;
      errors.push(formatAgentError(err));
      continue;
    }
    // Config failures must not be treated as missing history and create a replacement session.
    await host.onConfigOptions(configOptions);
    host.onReady();
    return;
  }
  const detail = errors.join("; ");
  // Empty / never-prompted agent sessions often fail load/resume (Cursor: not found;
  // Codex: no rollout for the thread id). Reuse this connection and mint a fresh one.
  if (/invalid params|not found|no conversation|no rollout/i.test(detail)) {
    host.setMirrorUpdates(true);
    await host.createAgentSession();
    return;
  }
  throw new Error(
    `Could not reopen session (${detail}). Send a message in this session to reconnect, then fork.`,
  );
}
