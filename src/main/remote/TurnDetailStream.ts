import type { Session } from "../../shared/session";
import type { TranscriptItem, TranscriptTurn } from "../../shared/transcript";
import type { RemoteTurnDetail } from "./RemoteTurnDetail";
import type { SseStream } from "./SseStream";
import { toRemoteTurnItem } from "./toRemoteTurnItem";

/** A streaming turn changes per chunk; coalesce to the newest. */
const THROTTLE_MS = 300;

/** One phone's open Turn Details: every step first, then only the steps that change. */
export class TurnDetailStream {
  private sent = new Map<string, TranscriptItem>();
  private pending: TranscriptTurn | null = null;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private stream: SseStream,
    private session: Session,
    readonly turnId: string,
  ) {}

  get sessionId(): string {
    return this.session.id;
  }

  /** Send now when nothing was sent yet or the turn ended, so the phone never shows a stale "running". */
  queue(turn: TranscriptTurn): void {
    this.pending = turn;
    if (this.sent.size === 0 || turn.status !== "running") return this.flush();
    this.timer ??= setTimeout(() => this.flush(), THROTTLE_MS);
  }

  /** The turn no longer exists; a 404 would read as a Mac that is still starting, and be retried. */
  sendGone(): void {
    this.stream.send("turnGone", { turnId: this.turnId });
    this.close();
  }

  close(): void {
    this.dispose();
    this.stream.close();
  }

  /** The phone hung up. */
  dispose(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.pending = null;
  }

  private flush(): void {
    const turn = this.pending;
    this.dispose();
    if (!turn) return;
    const items = [turn.user, ...turn.events, turn.assistant].filter((item) => item !== null);
    // Unchanged items keep their identity as a turn streams.
    const changed = items.filter((item) => this.sent.get(item.id) !== item);
    this.sent = new Map(items.map((item) => [item.id, item]));
    const detail: RemoteTurnDetail = {
      turnId: turn.id,
      status: turn.status,
      order: [...this.sent.keys()],
      items: changed.map((item) => toRemoteTurnItem(item, this.session)),
    };
    this.stream.send("turnDetail", detail);
  }
}
