import type * as acp from "@agentclientprotocol/sdk/unstable";
import type { SlashCommand } from "../../shared/session";
import type { AgentKind } from "../../shared/agentKind";
import type { SessionCallbacks } from "./SessionCallbacks";
import type { SessionOutput } from "./SessionOutput";
import type { TurnBuilder } from "./TurnBuilder";
import type { parseAutonomousTurnUpdate } from "./parseAutonomousTurnUpdate";
import type { PromptRunner } from "./PromptRunner";
import { dispatchSessionUpdate } from "./dispatchSessionUpdate";
import { sessionRoutes } from "./sessionRoutes";
import type { SubagentUpdate } from "./subagents/SubagentUpdate";
import { SubagentSessions } from "./subagents/SubagentSessions";

type RouterDeps = {
  agent: AgentKind;
  cwd: string;
  turns: TurnBuilder;
  output: SessionOutput;
  callbacks: () => SessionCallbacks;
  /** False during load/resume replay, which re-sends history the transcript already has. */
  mirroring: () => boolean;
  applyThreadStatus: PromptRunner["applyThreadStatus"];
  startAutonomousTurn: PromptRunner["startAutonomousTurn"];
  endAutonomousTurn: PromptRunner["endAutonomousTurn"];
  endReplay: () => void;
  /** Model/effort and other config options changed (e.g. `/model`). */
  onConfigOptions: (options: acp.SessionConfigOption[]) => void;
  /** The AcpSession that owns these updates, so subagent session ids route back to it. */
  owner: Parameters<typeof sessionRoutes.register>[1];
};

/** Routes one ACP session's updates: subagent sessions to their own transcripts, the rest to the main one. */
export class SessionUpdateRouter {
  readonly subagents: SubagentSessions;
  /** Keep announcements received while warming, before live callbacks are adopted. */
  availableCommands: readonly SlashCommand[] = [];

  constructor(private readonly deps: RouterDeps) {
    this.subagents = new SubagentSessions(
      deps.agent,
      deps.cwd,
      deps.turns,
      (subagentId, turn) => deps.callbacks().onSubagentTurn?.(subagentId, turn),
      (subagentSessionId) => sessionRoutes.register(subagentSessionId, deps.owner),
    );
  }

  update(sessionId: string, update: acp.SessionUpdate): void {
    const { deps } = this;
    if (this.subagents.owns(sessionId)) {
      if (deps.mirroring()) this.subagents.handleUpdate(sessionId, update);
      return;
    }
    const claude = deps.agent === "claude";
    if (claude && sessionId === deps.owner.sessionId &&
        update.sessionUpdate === "session_info_update" && isReplayEnd(update._meta)) {
      deps.endReplay();
      return;
    }
    dispatchSessionUpdate(update, {
      onAvailableCommands: (commands) => {
        this.availableCommands = commands;
        deps.callbacks().onAvailableCommands(commands);
      },
      onUsage: (usage) => deps.callbacks().onUsage(usage),
      onConfigOptions: (options) => deps.onConfigOptions(options),
      onTitle: (title) => deps.callbacks().onTitle(title),
      onOutput: (output) => {
        if (!claude || (sessionId === deps.owner.sessionId && deps.mirroring())) {
          deps.output.handleUpdate(output);
        }
      },
      onThreadStatus: (status) => {
        // Ignore live-status during load/resume replay — it would leave turnRunning
        // stuck true and the next user message would be sent as a steer.
        if (deps.mirroring()) deps.applyThreadStatus(status);
      },
    });
  }

  autonomousTurn(update: NonNullable<ReturnType<typeof parseAutonomousTurnUpdate>>): void {
    const { deps } = this;
    if (deps.agent !== "claude" || !deps.mirroring() || update.sessionId !== deps.owner.sessionId) return;
    if (update.state === "started") deps.startAutonomousTurn(update.id);
    else deps.endAutonomousTurn(update.id, update.state, update.summary);
  }

  /** Replay re-announces subagents whose transcripts are already saved, so it is skipped. */
  lifecycle(sessionId: string, update: SubagentUpdate): void {
    if (this.deps.mirroring()) this.subagents.handleLifecycle(sessionId, update);
  }

  dispose(): void {
    for (const id of this.subagents.sessionIds()) sessionRoutes.unregister(id);
  }
}

function isReplayEnd(meta: unknown): boolean {
  const air = (meta as { jetbrains?: { air?: { version?: unknown; loadReplayEnd?: unknown } } } | undefined)
    ?.jetbrains?.air;
  return air?.version === 1 && air.loadReplayEnd === true;
}
