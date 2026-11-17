import type { GitDiffScope } from "../../../shared/gitDiff";

interface Memory {
  scope: GitDiffScope;
  split: boolean;
  collapsed: Record<string, string>;
  scroll: Partial<Record<GitDiffScope, number>>;
  selected: string;
}

const sessions = new Map<string, Memory>();

/** Layout, collapse, selection, and scroll state survive mode/session switches. */
export function diffViewMemory(sessionId: string): Memory {
  let memory = sessions.get(sessionId);
  if (!memory) {
    memory = { scope: "all", split: false, collapsed: {}, scroll: {}, selected: "" };
    sessions.set(sessionId, memory);
  }
  return memory;
}
