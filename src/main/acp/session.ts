import { randomUUID } from "node:crypto";
import type * as acp from "@agentclientprotocol/sdk/unstable";
import type { AgentKind } from "../../shared/agentKind";
import type { SessionModelConfig, SlashCommand } from "../../shared/session";
import type { TranscriptTurn } from "../../shared/transcript";
import type { SessionOutput } from "./SessionOutput";
import type { SessionCallbacks } from "./SessionCallbacks";
import type { PromptRunner } from "./PromptRunner";
import type { PendingQuestions } from "./PendingQuestions";
import { forkAcpSession } from "./forkAcpSession";
import { resumeAcpSession } from "./resumeAcpSession";
import type { AirForkPoint } from "./airForkPoint";
import { sessionRoutes } from "./sessionRoutes";
import type { TurnBuilder } from "./TurnBuilder";
import { connectAcpAgent } from "./connectAcpAgent";
import { attachAcpSession } from "./attachAcpSession";
import { createAcpSession } from "./createAcpSession";
import { SharedAgentConnection } from "./SharedAgentConnection";
import type { SessionUpdateRouter } from "./SessionUpdateRouter";
import type { SessionConfigOptions } from "./SessionConfigOptions";
import { sessionConnectionHandlers } from "./sessionConnectionHandlers";
import { sessionMcpServers } from "../mcp/sessionMcpServers";
import { sessionPipeline } from "./sessionPipeline";

export class AcpSession extends SharedAgentConnection {
  sessionId: string | null = null;
  /** Model, effort and other agent config options. */
  readonly config: SessionConfigOptions;

  private canLoad = false;
  private canResume = false;
  private hasBirdsongTools = false;
  private initializationMeta: unknown;
  private questions: PendingQuestions;
  private output: SessionOutput;
  private turns: TurnBuilder;
  private updates: SessionUpdateRouter;
  private runner: PromptRunner;
  private disposed = false;
  private commandListeners = new Set<(commands: readonly SlashCommand[]) => void>();
  /** When false, session updates are not mirrored to the transcript (load/resume replay). */
  private mirrorUpdates = true;
  private starting: Promise<void> | null = null;

  constructor(
    readonly id: string,
    readonly agent: AgentKind,
    readonly cwd: string,
    private cb: SessionCallbacks,
    modelConfig?: SessionModelConfig,
  ) {
    super();
    const core = sessionPipeline({
      id,
      agent,
      cwd,
      modelConfig,
      owner: this,
      sessionCallbacks: () => this.cb,
      callbacks: () => this.callbacks(),
      connection: () => this.connection,
      sessionId: () => this.sessionId,
      isDisposed: () => this.disposed,
      hasBirdsongTools: () => this.hasBirdsongTools,
      slashCommands: () => this.updates.availableCommands,
      showUpdates: () => { this.mirrorUpdates = true; },
      renewSession: async () => {
        this.clearSessionId();
        await this.createAgentSession();
      },
      finishPending: (status) => this.finishPending(status),
      noteSystem: (text, turnId) => this.noteSystem(text, turnId),
      mirroring: () => this.mirrorUpdates,
      setMirrorUpdates: (value) => { this.mirrorUpdates = value; },
    });
    this.questions = core.questions;
    this.output = core.output;
    this.turns = core.turns;
    this.runner = core.runner;
    this.config = core.config;
    this.updates = core.updates;
  }

  /** Current slash commands, plus later `available_commands_update`s. Replays immediately. */
  watchSlashCommands(listener: (commands: readonly SlashCommand[]) => void): () => void {
    this.commandListeners.add(listener);
    listener([...this.updates.availableCommands]);
    return () => { this.commandListeners.delete(listener); };
  }

  /** Replace in-memory turns after hydrate/fork (does not emit). */
  restoreTurns(turns: TranscriptTurn[]): void {
    this.turns.restore(turns);
  }

  /** Rebind callbacks after claiming from the warm pool; the session keeps its id. */
  adopt(cb: SessionCallbacks): void {
    this.cb = cb;
    // Steering support was reported to the warm no-op callbacks; replay it to the new owner.
    this.runner.configureDelivery(this.initializationMeta);
    this.config.replay();
    this.cb.onAvailableCommands([...this.updates.availableCommands]);
  }

  start(options?: { quiet?: boolean }): Promise<void> {
    return this.startOnce(async () => {
      await this.connectAgent(await sessionMcpServers(this.id), options);
      await this.createAgentSession();
    });
  }

  /** Reopen a persisted session via load or resume. */
  attachExisting(sessionId: string, options?: { quiet?: boolean }): Promise<void> {
    return this.startOnce(() => this.attachSession(sessionId, options));
  }

  /** Concurrent start/attach calls share one in-flight connect. */
  private startOnce(run: () => Promise<void>): Promise<void> {
    if (this.starting) return this.starting;
    if (this.sessionId) return Promise.resolve();
    this.starting = run().finally(() => { this.starting = null; });
    return this.starting;
  }

  /** Allocate a new agent session on the current connection. */
  private async createAgentSession(config = this.config.snapshot()): Promise<void> {
    const mcpServers = await sessionMcpServers(this.id);
    if (this.disposed || !this.connection) throw new Error("Session closed");
    this.runner.markIdle();
    const session = await createAcpSession(this.connection, this.cwd, mcpServers);
    if (this.disposed) throw new Error("Session closed");
    this.hasBirdsongTools = mcpServers.some((server) => server.name === "birdsong");
    this.setSessionId(session.sessionId);
    this.config.note(session.configOptions);
    await this.config.restore(config);
    this.runner.reportReady();
  }

  private async attachSession(sessionId: string, options?: { quiet?: boolean }): Promise<void> {
    const config = this.config.snapshot();
    const mcpServers = await sessionMcpServers(this.id);
    await this.connectAgent(mcpServers, options);
    await attachAcpSession({
      connection: this.connection,
      canLoad: this.canLoad,
      canResume: this.canResume,
      resumesWithoutReplay: this.agent === "claude",
      cwd: this.cwd,
      mcpServers,
      turnCount: () => this.turns.count,
      setMirrorUpdates: (value) => { this.mirrorUpdates = value; },
      markIdle: () => this.runner.markIdle(),
      setSessionId: (id) => this.setSessionId(id),
      clearSessionId: () => this.clearSessionId(),
      resetOutput: () => this.output.reset(),
      onReady: () => this.runner.reportReady(),
      onConfigOptions: async (options) => {
        this.config.note(options);
        await this.config.restore(config);
      },
      createAgentSession: () => this.createAgentSession(config),
    }, sessionId);
  }

  /** Fork on this connection and return a sibling session sharing the agent process. */
  async forkSibling(id: string, cb: SessionCallbacks, forkPoint?: AirForkPoint, turns?: TranscriptTurn[]): Promise<AcpSession> {
    // The fork's own MCP servers: they name its new Birdsong session id.
    const mcpServers = await sessionMcpServers(id);
    if (!this.connection || !this.sessionId || this.disposed) throw new Error("Session not ready to fork");
    const forked = await forkAcpSession(this.connection, this.sessionId, this.cwd, forkPoint, mcpServers);
    const child = new AcpSession(id, this.agent, this.cwd, cb);
    if (turns) child.restoreTurns(turns);
    child.hasBirdsongTools = mcpServers.some((server) => server.name === "birdsong");
    child.updates.availableCommands = this.updates.availableCommands;
    child.cb.onAvailableCommands([...child.updates.availableCommands]);
    this.shareConnectionWith(child);
    child.setSessionId(forked.sessionId);
    child.initializationMeta = this.initializationMeta;
    child.runner.configureDelivery(this.initializationMeta);
    // The fork's session record already copies the parent's model/effort; only report what differs.
    child.config.inherit(this.config);
    child.config.note(forked.configOptions);
    try {
      // Fork only allocates a session id. Codex and Claude need resume before
      // prompts/updates work on the forked id.
      if (this.agent === "codex" || this.agent === "claude") {
        if (!child.connection) throw new Error("Session closed while forking");
        // Claude's v1 resume sends live updates only. Codex can replay history.
        child.mirrorUpdates = this.agent === "claude";
        const resumed = await resumeAcpSession(child.connection, forked.sessionId, this.cwd, mcpServers);
        child.config.note(resumed.configOptions);
      }
    } catch (error) {
      await child.dispose();
      throw error;
    }
    child.runner.reportReady();
    return child;
  }

  private callbacks(): SessionCallbacks {
    return {
      ...this.cb,
      onAvailableCommands: (commands) => {
        this.cb.onAvailableCommands(commands);
        for (const listener of this.commandListeners) listener(commands);
      },
    };
  }

  private setSessionId(sessionId: string): void {
    this.clearSessionId();
    this.sessionId = sessionId;
    sessionRoutes.register(sessionId, this);
  }

  private clearSessionId(): void {
    sessionRoutes.unregister(this.sessionId);
    this.sessionId = null;
  }

  private async connectAgent(mcpServers: acp.McpServer[], options?: { quiet?: boolean }): Promise<void> {
    const result = await connectAcpAgent({
      agent: this.agent,
      cwd: this.cwd,
      mcpServers,
      quiet: options?.quiet,
      onConnect: (proc, connection) => {
        this.proc = proc;
        this.connection = connection;
      },
      ...sessionConnectionHandlers({
        callbacks: () => this.cb,
        questions: this.questions,
        runner: this.runner,
        isDisposed: () => this.disposed,
        noteSystem: (text) => this.noteSystem(text),
        finishPending: (status) => this.finishPending(status),
        closeConnection: () => this.connection?.close(),
        interruptSiblingTurns: (error) => {
          for (const sibling of sessionRoutes.siblingsOf(this)) {
            if (sibling.runner.interruptAutonomousTurn()) sibling.cb.onStatus("error", error);
          }
        },
        routerFor: (sessionId) => this.routerFor(sessionId),
      }),
    });
    if (this.disposed) throw new Error("Session closed");
    this.hasBirdsongTools = mcpServers.some((server) => server.name === "birdsong");
    this.canLoad = result.canLoad;
    this.canResume = result.canResume;
    this.initializationMeta = result.initializationMeta;
  }

  /** Fork siblings share this connection, so an update may belong to another AcpSession. */
  private routerFor(sessionId: string): SessionUpdateRouter | null {
    const target = sessionRoutes.forUpdate(sessionId, this);
    return target.disposed ? null : target.updates;
  }

  /** Waits for the turn to finish unless `{ wait: false }`; returns the turn id. */
  prompt(text: string, options?: { wait?: boolean }): Promise<string> {
    return this.runner.prompt(text, options);
  }

  cancel(): Promise<void> {
    return this.runner.cancel();
  }

  respondAskQuestion(requestId: string, outcome: unknown): void {
    this.questions.respond(requestId, outcome);
  }

  private finishPending(status: string): void {
    this.questions.cancel();
    this.output.finish(status);
    this.updates.subagents.finish();
  }

  private noteSystem(text: string, turnId?: string): void {
    if (this.disposed || !this.mirrorUpdates) return;
    this.turns.apply({ id: randomUUID(), role: "system", text, at: Date.now() }, undefined, turnId);
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.finishPending("interrupted");
    this.disposed = true;
    this.runner.dispose();
    this.updates.dispose();
    this.clearSessionId();
    this.releaseConnection();
  }
}
