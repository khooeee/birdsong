/** Steer outcomes include a completion; prompt mode must be started by the caller after opening a turn. */
type DeliveryDecision =
  | { mode: "injected" | "startedNewTurn"; completion: Promise<void> }
  | { mode: "prompt" };

interface Options {
  isRunning: () => boolean;
  prompt: (text: string, id: string) => Promise<void>;
  steer: (text: string) => Promise<unknown>;
  /** Send a prompt into the running turn without waiting for it (Devin's mid-turn prompts). */
  injectPrompt: (text: string) => void;
  onSupport: (supported: boolean) => void;
}

/** How a busy agent takes steering: a `_session/steering` request, or another `session/prompt`. */
type SteeringStyle = "steeringRequest" | "midTurnPrompt" | null;

function steeringStyle(metadata: unknown): SteeringStyle {
  if (!metadata || typeof metadata !== "object") return null;
  const steering = "steering" in metadata ? metadata.steering : null;
  if (steering && typeof steering === "object" && "supported" in steering && steering.supported === true) {
    return "steeringRequest";
  }
  return "cognition.ai/midTurnPrompts" in metadata && metadata["cognition.ai/midTurnPrompts"] === true
    ? "midTurnPrompt" : null;
}

export class PromptDelivery {
  private style: SteeringStyle = null;
  private dispatch = Promise.resolve();

  constructor(private options: Options) {}

  configure(metadata: unknown): void {
    this.style = steeringStyle(metadata);
    this.options.onSupport(this.style !== null);
  }

  send(text: string, id: string): Promise<void> {
    return this.enqueue(text).then((decision) => {
      if (decision.mode === "prompt") return this.options.prompt(text, id);
      return decision.completion;
    });
  }

  /**
   * Resolve once delivery is decided. Prompt mode does not start the agent
   * request — the caller must open a turn first, then call `startPrompt`.
   */
  enqueue(text: string): Promise<DeliveryDecision> {
    // Serialize delivery decisions, but don't hold this lock for a whole prompt.
    const delivery = this.dispatch.then(() => this.deliver(text));
    this.dispatch = delivery.then(() => undefined, () => undefined);
    return delivery;
  }

  startPrompt(text: string, id: string): Promise<void> {
    return this.options.prompt(text, id);
  }

  private async deliver(text: string): Promise<DeliveryDecision> {
    if (this.style === "midTurnPrompt" && this.options.isRunning()) {
      this.options.injectPrompt(text);
      return { mode: "injected", completion: Promise.resolve() };
    }
    if (this.style === "steeringRequest" && this.options.isRunning()) {
      let response: unknown;
      try {
        response = await this.options.steer(text);
      } catch (error) {
        if (!error || typeof error !== "object" || !("code" in error) || error.code !== -32601) {
          throw error;
        }
        // A stale capability flag must not prevent the message from being sent.
        this.style = null;
        this.options.onSupport(false);
        return { mode: "prompt" };
      }
      const outcome = response && typeof response === "object" && "outcome" in response
        ? response.outcome : undefined;
      if (outcome === "injected") {
        return { mode: "injected", completion: Promise.resolve() };
      }
      if (outcome === "startedNewTurn") {
        return { mode: "startedNewTurn", completion: Promise.resolve() };
      }
      if (outcome !== "promptRequired") {
        // Retrying an ambiguous failure could deliver the same instruction twice.
        throw new Error("The agent did not confirm delivery of the steering message.");
      }
    }
    return { mode: "prompt" };
  }
}
