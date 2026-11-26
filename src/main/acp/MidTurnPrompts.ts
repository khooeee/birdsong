/**
 * Devin's mid-turn prompts: a `session/prompt` sent while a turn runs joins that turn,
 * and its request resolves when the turn ends. One that lands just after the turn ended
 * starts the next turn instead, so the running prompt waits for these before settling.
 */
export class MidTurnPrompts {
  private inFlight = new Set<Promise<string | null>>();

  /** Send without waiting; `onError` reports a failed request. */
  send(request: () => Promise<{ stopReason: string }>, onError: (error: unknown) => void): void {
    const tracked: Promise<string | null> = Promise.resolve()
      .then(request)
      .then(
        (response) => response.stopReason,
        (error: unknown) => {
          onError(error);
          return null;
        },
      )
      .finally(() => this.inFlight.delete(tracked));
    this.inFlight.add(tracked);
  }

  /** Resolve once every mid-turn prompt has, with the last stop reason any of them reported. */
  async settled(): Promise<string | null> {
    let stopReason: string | null = null;
    while (this.inFlight.size > 0) {
      for (const reason of await Promise.all(this.inFlight)) stopReason = reason ?? stopReason;
    }
    return stopReason;
  }
}
