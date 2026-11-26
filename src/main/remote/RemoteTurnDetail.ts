import type { TranscriptTurn } from "../../shared/transcript";
import type { RemoteTurnItem } from "./RemoteTurnItem";

/** A turn's steps as they stream: the ids of all of them in order, and the ones new or changed since the last send. */
export interface RemoteTurnDetail {
  turnId: string;
  status: TranscriptTurn["status"];
  order: string[];
  items: RemoteTurnItem[];
}
