import type { IncomingMessage, ServerResponse } from "node:http";
import type { TranscriptTurn } from "../../shared/transcript";
import { sendJson } from "../control/sendJson";
import type { SessionManager } from "../sessions/SessionManager";
import { SseStream } from "./SseStream";
import { TurnDetailStream } from "./TurnDetailStream";

/** Streams single turns in full to the iOS app's Turn Details; transcripts there carry only prompts and replies. */
export class TurnDetailHub {
  private streams = new Set<TurnDetailStream>();
  /** Bumped by `closeAll`, so a request that was still loading then can't open with a replaced token. */
  private generation = 0;

  constructor(private sessions: SessionManager) {
    sessions.subscribe((channel, payload) => this.onEvent(channel, payload));
  }

  /** `GET /sessions/:id/turns/:turnId/events`: the turn's steps now, then the ones that change. */
  async open(sessionId: string, turnId: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
    const { generation } = this;
    const turns = await this.sessions.getTranscript(sessionId);
    // The phone hung up while loading; its close event won't fire again to clean up.
    if (res.destroyed) return;
    if (generation !== this.generation) return sendJson(res, 401, { error: "Unauthorized" });
    const session = this.sessions.getSession(sessionId);
    if (!session) return sendJson(res, 404, { error: "Session not found" });
    const sse = new SseStream(req, res, () => {
      detail.dispose();
      this.streams.delete(detail);
    });
    const detail = new TurnDetailStream(sse, session, turnId);
    const turn = turns.find((entry) => entry.id === turnId);
    if (!turn) return detail.sendGone();
    this.streams.add(detail);
    detail.queue(turn);
  }

  closeAll(): void {
    this.generation++;
    for (const stream of this.streams) stream.close();
    this.streams.clear();
  }

  private onEvent(channel: string, payload: unknown): void {
    if (this.streams.size === 0) return;
    if (channel === "transcript") {
      const { sessionId, turn } = payload as { sessionId: string; turn: TranscriptTurn };
      for (const stream of this.streams) {
        if (stream.sessionId === sessionId && stream.turnId === turn.id) stream.queue(turn);
      }
    }
    if (channel === "transcript:reset") {
      const { sessionId, turns } = payload as { sessionId: string; turns: TranscriptTurn[] };
      for (const stream of this.streams) {
        if (stream.sessionId !== sessionId) continue;
        const turn = turns.find((entry) => entry.id === stream.turnId);
        if (turn) {
          stream.queue(turn);
        } else {
          // A queued prompt that was discarded. Forget it at once: a write after its response ended would throw.
          this.streams.delete(stream);
          stream.sendGone();
        }
      }
    }
  }
}
