import type { PushContent } from "./PushContent";

/** A push as every platform gets it: the content plus the unread state. */
export type PushPayload = PushContent & {
  /** The iPhone icon's count; 0 clears it, absent leaves it. */
  badge?: number;
  /** Sessions still unread, so Android can clear alerts read elsewhere; absent when there are too many. */
  unreadIds?: string[];
};

/** Sends one payload to every device of a platform; true for each that got it or can never get it. */
export type PushDelivery = (payload: PushPayload) => Promise<boolean[]>;
