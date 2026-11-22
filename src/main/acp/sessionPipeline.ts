import type * as acp from "@agentclientprotocol/sdk/unstable";
import type { AgentKind } from "../../shared/agentKind";
import type { SessionModelConfig, SlashCommand } from "../../shared/session";
import type { TranscriptTurn } from "../../shared/transcript";
import type { AcpSession } from "./session";
import type { SessionCallbacks } from "./SessionCallbacks";
import { PendingQuestions } from "./PendingQuestions";
import { PromptRunner } from "./PromptRunner";
import { SessionConfigOptions } from "./SessionConfigOptions";
import { SessionOutput } from "./SessionOutput";
import { SessionUpdateRouter } from "./SessionUpdateRouter";
import { TurnBuilder } from "./TurnBuilder";

type Deps = {
  id: string;
  agent: AgentKind;
  cwd: string;
  modelConfig?: SessionModelConfig;
  owner: AcpSession;
  /** The adopted callbacks, read on each call so a warm session can rebind them. */
  sessionCallbacks: () => SessionCallbacks;
  /** Same callbacks, plus slash-command watchers. */
  callbacks: () => SessionCallbacks;
  connection: () => acp.ClientConnection | null;
  sessionId: () => string | null;
  isDisposed: () => boolean;
  hasBirdsongTools: () => boolean;
  slashCommands: () => readonly SlashCommand[];
  showUpdates: () => void;
  renewSession: () => Promise<void>;
  finishPending: (status: string) => void;
  noteSystem: (text: string, turnId?: string) => void;
  mirroring: () => boolean;
  setMirrorUpdates: (value: boolean) => void;
};

/** Turns, prompts, questions, and update routing for one AcpSession. */
export function sessionPipeline(deps: Deps) {
  const sessionCallbacks = deps.sessionCallbacks;
  const questions = new PendingQuestions(
    deps.id,
    (req) => sessionCallbacks().onAskQuestion(req),
    (requestId) => sessionCallbacks().onQuestionSettled?.(requestId),
  );
  // Lifecycle emits must reach the UI; only gate streamed load/resume replay below.
  const turns = new TurnBuilder((turn: TranscriptTurn) => sessionCallbacks().onTurn(turn));
  const output = new SessionOutput(deps.agent, deps.cwd, (item, replaceId) => {
    if (!deps.mirroring()) return;
    turns.apply(item, replaceId);
  });
  const runner = new PromptRunner({
    turns,
    output,
    questions,
    callbacks: deps.sessionCallbacks,
    connection: deps.connection,
    sessionId: deps.sessionId,
    hasBirdsongTools: deps.hasBirdsongTools,
    slashCommands: deps.slashCommands,
    isDisposed: deps.isDisposed,
    showUpdates: deps.showUpdates,
    renewSession: deps.renewSession,
    finishPending: deps.finishPending,
    noteSystem: deps.noteSystem,
    worksUnprompted: deps.agent === "claude",
  });
  const config = new SessionConfigOptions({
    connection: deps.connection,
    sessionId: deps.sessionId,
    onModelConfig: (config) => sessionCallbacks().onModelConfig(config),
  }, deps.modelConfig);
  const updates = new SessionUpdateRouter({
    agent: deps.agent,
    cwd: deps.cwd,
    turns,
    output,
    callbacks: deps.callbacks,
    mirroring: deps.mirroring,
    applyThreadStatus: (status) => runner.applyThreadStatus(status),
    startAutonomousTurn: (id) => runner.startAutonomousTurn(id),
    endAutonomousTurn: (id, state, summary) => runner.endAutonomousTurn(id, state, summary),
    endReplay: () => {
      if (deps.mirroring()) return;
      output.reset();
      deps.setMirrorUpdates(true);
    },
    onConfigOptions: (options) => config.note(options),
    owner: deps.owner,
  });
  return { questions, output, turns, runner, config, updates };
}
