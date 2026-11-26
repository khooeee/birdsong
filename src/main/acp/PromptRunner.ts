import { randomUUID } from "node:crypto";
import * as acp from "@agentclientprotocol/sdk/unstable";
import type { TranscriptItem } from "../../shared/transcript";
import { formatAgentError } from "../../shared/formatAgentError";
import type { PromptHost } from "./PromptHost";
import { PromptCompletion } from "./PromptCompletion";
import { PromptQueue } from "./PromptQueue";
import type { PromptDelivery } from "./PromptDelivery";
import { MidTurnPrompts } from "./MidTurnPrompts";
import { agentPrompt } from "./agentPrompt";
import { createPromptDelivery } from "./createPromptDelivery";
import { usageLimitResetAt } from "./usageLimitResetAt";

/** Sends prompts (or steers), tracks whether a turn is running, and cancels it. */
export class PromptRunner {
  private turnRunning = false;
  private remoteTurnActive: boolean | null = null;
  private stopping = false;
  private promptTurnId: string | null = null;
  private autonomousTurnId: string | null = null;
  private completion: PromptCompletion;
  private prompts: PromptQueue;
  private delivery: PromptDelivery;
  private midTurn = new MidTurnPrompts();

  constructor(private host: PromptHost) {
    const { turns } = host;
    this.completion = new PromptCompletion(() => {
      if (this.promptTurnId) turns.complete(this.promptTurnId);
      host.callbacks().onPromptComplete();
    });
    this.prompts = new PromptQueue(
      (text) => this.runPrompt(text),
      {
        onWaiting: (id) => turns.setQueued(id, true),
        onReleased: (id) => turns.activate(id),
        onDiscarded: (id) => {
          const removed = turns.discard(id);
          if (removed) host.callbacks().onTurnRemoved?.(removed.id);
        },
      },
    );
    this.delivery = createPromptDelivery(host, this.prompts, this.midTurn, () => this.turnRunning);
  }

  get stopRequested(): boolean {
    return this.stopping;
  }

  configureDelivery(meta: unknown): void {
    this.delivery.configure(meta);
  }

  markIdle(): void {
    this.turnRunning = false;
    this.remoteTurnActive = null;
  }

  reportReady(): void {
    if (!this.turnRunning) this.host.callbacks().onStatus("ready");
  }

  startAutonomousTurn(id: string): void {
    if (this.autonomousTurnId) return;
    this.autonomousTurnId = id;
    this.turnRunning = true;
    this.stopping = false;
    this.prompts.setPaused(true);
    this.host.output.reset();
    this.host.turns.openAutonomous(id);
    this.host.callbacks().onStatus("running");
  }

  endAutonomousTurn(id: string, state: "completed" | "failed" | "stopped" | "disconnected", summary?: string): void {
    if (id !== this.autonomousTurnId) return;
    const { host } = this;
    const error = state === "failed" ? summary || "Claude's self-started turn failed" : undefined;
    host.output.finish(state === "completed" ? "status unavailable" : "interrupted");
    host.output.reset();
    if (state === "stopped" || state === "disconnected") this.stopTurn(id);
    else {
      if (error) host.noteSystem(error, id);
      host.turns.complete(id);
    }
    this.autonomousTurnId = null;
    this.stopping = false;
    this.turnRunning = this.completion.requestPending;
    // A prompt sent just before the start update can take over Claude's active work.
    if (state === "disconnected") this.prompts.clearPending();
    else if (this.turnRunning && this.promptTurnId) host.turns.activateTurn(this.promptTurnId);
    else host.callbacks().onStatus(error ? "error" : "ready", error);
    if (state === "completed" && !this.turnRunning) host.callbacks().onPromptComplete();
    this.prompts.setPaused(false);
  }

  interruptAutonomousTurn(): boolean {
    if (!this.autonomousTurnId) return false;
    this.endAutonomousTurn(this.autonomousTurnId, "disconnected");
    return true;
  }

  /** Apply a codex `threadStatus` live update. */
  applyThreadStatus(status: "active" | "idle" | "systemError"): void {
    if (status !== "active") this.host.finishPending(status === "idle" ? "status unavailable" : "interrupted");
    this.completion.status(status);
    this.remoteTurnActive = status === "active";
    this.turnRunning = this.remoteTurnActive;
    this.host.callbacks().onStatus(status === "active" ? "running" : status === "idle" ? "ready" : "error");
  }

  /** Pass `{ wait: false }` to return the turn id before the turn finishes. */
  async prompt(text: string, options?: { wait?: boolean }): Promise<string> {
    const { host } = this;
    if (!host.sessionId() || host.isDisposed()) throw new Error("Session not ready");
    host.showUpdates();
    const userItem: TranscriptItem = { id: randomUUID(), role: "user", text, at: Date.now() };
    // A steer uses the active turn. A prompt opens its own before requesting output.
    const decision = await this.delivery.enqueue(text);
    let turnId: string;
    let completion: Promise<void>;
    if (decision.mode === "injected") {
      host.output.reset();
      host.turns.apply(userItem);
      turnId = host.turns.activeTurnId() ?? userItem.id;
      completion = decision.completion;
    } else if (decision.mode === "startedNewTurn") {
      host.output.reset();
      const turn = host.turns.open(userItem);
      turnId = turn.id;
      this.promptTurnId = turnId;
      this.completion.detached();
      host.turns.activateLatestRunning();
      if (this.remoteTurnActive !== false) {
        this.turnRunning = true;
        host.callbacks().onStatus("running");
      }
      completion = decision.completion;
    } else {
      const turn = host.turns.open(userItem);
      turnId = turn.id;
      completion = this.delivery.startPrompt(text, userItem.id);
    }

    const finished = completion.then(
      () => {
        if (decision.mode === "injected") return;
        if (!this.turnRunning) host.turns.complete(turnId);
        else host.turns.completeIfOrphan(userItem.id);
      },
      (error) => {
        host.turns.complete(turnId);
        throw error;
      },
    );
    if (options?.wait === false) {
      void finished.catch(() => undefined);
      return turnId;
    }
    await finished;
    return turnId;
  }

  async cancel(): Promise<void> {
    const { host } = this;
    this.prompts.clearPending();
    const connection = host.connection();
    const sessionId = host.sessionId();
    if (!connection || !sessionId || this.stopping || host.isDisposed()) return;
    if (!this.turnRunning) {
      // Claude Code answers a finished background command on its own; cancel that unreported work too.
      if (!host.worksUnprompted) return;
      host.questions.cancel();
      await connection.agent.notify(acp.methods.agent.session.cancel, { sessionId });
      return;
    }
    this.stopping = true;
    host.questions.cancel();
    const autonomousId = this.autonomousTurnId;
    const turnId = host.turns.activeTurnId();
    if (autonomousId) {
      try {
        const result = await connection.agent.request("_session/async_task/stop", {
          sessionId, asyncTaskId: autonomousId,
        }) as { stopped?: boolean };
        if (result.stopped) this.endAutonomousTurn(autonomousId, "stopped");
      } finally {
        if (this.autonomousTurnId === autonomousId) this.stopping = false;
      }
      return;
    }
    this.completion.cancel();
    try {
      await connection.agent.notify(acp.methods.agent.session.cancel, { sessionId });
      if (turnId) this.stopTurn(turnId);
    } catch (error) {
      this.stopping = false;
      throw error;
    }
  }

  private stopTurn(turnId: string): void {
    this.host.turns.stop({ id: randomUUID(), role: "stopped", text: "Stopped", at: Date.now() }, turnId);
  }

  dispose(): void {
    this.interruptAutonomousTurn();
    this.completion.cancel();
    this.prompts.dispose();
  }

  private async runPrompt(text: string): Promise<void> {
    const { host } = this;
    if (!host.connection() || !host.sessionId() || host.isDisposed()) throw new Error("Session not ready");
    this.promptTurnId = host.turns.activeTurnId();
    this.completion.start();
    this.stopping = false;
    this.markRunning();
    host.output.reset();

    try {
      await this.requestWithRetry(text);
    } catch (error) {
      this.failPrompt(formatAgentError(error));
      const resetAt = usageLimitResetAt(error);
      if (resetAt !== null) host.callbacks().onUsageLimit?.(resetAt);
      throw error;
    }
  }

  /** Stale agent sessions after restart get one renewal and one retry. */
  private async requestWithRetry(text: string): Promise<void> {
    const { host } = this;
    try {
      await this.requestPrompt(text);
      return;
    } catch (error) {
      if (!/session not found/i.test(formatAgentError(error)) || host.isDisposed() || !host.connection()) {
        throw error;
      }
    }
    await host.renewSession();
    host.showUpdates();
    this.markRunning();
    await this.requestPrompt(text);
  }

  private async requestPrompt(text: string): Promise<void> {
    const { host } = this;
    const connection = host.connection();
    const sessionId = host.sessionId();
    if (!connection || !sessionId || host.isDisposed()) throw new Error("Session not ready");
    const response = await connection.agent.request(acp.methods.agent.session.prompt, {
      sessionId,
      prompt: agentPrompt(text, host.hasBirdsongTools(), host.slashCommands()),
    });
    const stopReason = (await this.midTurn.settled()) ?? response.stopReason;
    if (!this.autonomousTurnId && this.remoteTurnActive !== true) {
      host.finishPending(stopReason === "end_turn" ? "status unavailable" : "interrupted");
    }
    this.completion.finish(stopReason);
    this.markSettled("ready");
  }

  private failPrompt(msg: string): void {
    const { host } = this;
    if (!this.autonomousTurnId) host.finishPending("interrupted");
    this.completion.finish("error");
    if (this.promptTurnId) {
      host.noteSystem(msg, this.promptTurnId);
      host.turns.complete(this.promptTurnId);
    }
    this.markSettled("error", msg);
  }

  private markRunning(): void {
    this.turnRunning = true;
    this.remoteTurnActive = null;
    this.host.callbacks().onStatus("running");
  }

  /** The prompt request settled; go idle unless the agent still reports an active turn. */
  private markSettled(status: "ready" | "error", error?: string): void {
    if (this.autonomousTurnId || this.remoteTurnActive === true || this.host.isDisposed()) return;
    this.stopping = false;
    this.turnRunning = false;
    this.host.callbacks().onStatus(status, error);
  }
}
