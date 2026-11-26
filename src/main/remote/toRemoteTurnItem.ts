import { stripCursorStreamNoise } from "../../shared/cursorStreamNoise";
import { fileChangeLabel } from "../../shared/fileChangeLabel";
import { relativeChangePath } from "../../shared/relativeChangePath";
import type { Session } from "../../shared/session";
import type { TranscriptItem } from "../../shared/transcript";
import type { RemoteTurnItem } from "./RemoteTurnItem";

type ItemSession = Pick<Session, "agent" | "cwd">;

/** File rows use paths relative to the Session Folder; absolute ones don't fit a phone. */
function fileLabels(item: TranscriptItem, cwd: string): string[] {
  return (item.fileChanges ?? []).map((change) => {
    const path = relativeChangePath(change.path, cwd);
    const fromPath = change.fromPath && relativeChangePath(change.fromPath, cwd);
    return fileChangeLabel({ ...change, path, fromPath }, item.toolStatus);
  });
}

function itemText(item: TranscriptItem, session: ItemSession): string {
  const text = stripCursorStreamNoise(session.agent, item.text);
  const labels = fileLabels(item, session.cwd);
  if (!labels.length) return text;
  // An edit tool's text is these same labels; a shell command's text is the command.
  return item.text === item.toolTitle ? [text, ...labels].join("\n") : labels.join("\n");
}

export function toRemoteTurnItem(item: TranscriptItem, session: ItemSession): RemoteTurnItem {
  return {
    id: item.id,
    role: item.role,
    at: item.at,
    text: itemText(item, session),
    queued: item.queued || undefined,
    status: item.toolStatus,
    task: item.subagentId ? item.toolTitle : undefined,
    images: item.images?.length || undefined,
  };
}
