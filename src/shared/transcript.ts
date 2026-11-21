import type { FileChange } from "./fileChange";

type TurnStatus = "running" | "complete" | "stopped";

export type TranscriptRole =
  | "user"
  | "assistant"
  | "thought"
  | "tool"
  | "system"
  | "stopped"
  /** A subagent the agent started; its own transcript is stored separately. */
  | "subagent"
  /** A due reminder, as its own turn's `user` item; the agent never sees it. */
  | "reminder";

export interface TranscriptItem {
  id: string;
  role: TranscriptRole;
  text: string;
  at: number;
  /** Waiting behind an in-flight prompt (not yet sent to the agent). */
  queued?: boolean;
  toolCallId?: string;
  toolStatus?: string;
  toolTitle?: string;
  fileChanges?: FileChange[];
  /** `tool` rows: saved image file names the tool returned or viewed (see storeImage). */
  images?: string[];
  /** `subagent` rows: id of the subagent transcript this row opens. */
  subagentId?: string;
}

/** One turn of work and its session updates. An agent-started turn has no user message. */
export interface TranscriptTurn {
  id: string;
  /** Turn start time — used for find sort order. */
  at: number;
  user: TranscriptItem | null;
  /** Latest assistant message; prior assistants live in `events`. */
  assistant: TranscriptItem | null;
  events: TranscriptItem[];
  /** Aggregated from tool events in this turn. */
  fileChanges: FileChange[];
  status: TurnStatus;
}
