import type { TranscriptRole } from "../../shared/transcript";

/** One step of a turn as the iOS app's Turn Details shows it: text only, without diffs or images. */
export interface RemoteTurnItem {
  id: string;
  role: TranscriptRole;
  at: number;
  text: string;
  queued?: boolean;
  /** A tool's or subagent's state, e.g. `completed`. */
  status?: string;
  /** What a subagent was asked to do. */
  task?: string;
  /** How many images a tool returned. */
  images?: number;
}
