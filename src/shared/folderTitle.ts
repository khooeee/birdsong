import type { AgentKind } from "./agentKind";

/** A session title under its folder's name, optionally labeled with its agent. */
export function folderTitle(cwd: string, name: string, agent?: AgentKind): string {
  const folder = cwd.split(/[\\/]/).filter(Boolean).pop();
  const heading = agent ? `${folder || cwd} (${agent})` : folder;
  return [heading, name.trim()].filter(Boolean).join("\n");
}
