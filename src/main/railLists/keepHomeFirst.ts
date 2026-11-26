import type { SessionRailLists } from "./SessionRailLists";

/** Home stays the first pinned session wherever it would land; the other ids keep their order. */
export function keepHomeFirst(lists: SessionRailLists, homeId: string | null): SessionRailLists {
  if (!homeId || lists.pinnedIds[0] === homeId) return lists;
  if (!lists.pinnedIds.includes(homeId) && !lists.unpinnedIds.includes(homeId)) return lists;
  return {
    pinnedIds: [homeId, ...lists.pinnedIds.filter((id) => id !== homeId)],
    unpinnedIds: lists.unpinnedIds.filter((id) => id !== homeId),
  };
}
