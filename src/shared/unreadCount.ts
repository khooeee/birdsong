import type { SessionListPayload } from "./birdsongApi";

/** Sessions in the rail with a reply nobody has read. */
export function unreadCount({ pinned, unpinned }: SessionListPayload): number {
  return [...pinned, ...unpinned].filter((session) => session.unread).length;
}
