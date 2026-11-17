import { ipcErrorMessage } from "../../../shared/ipcErrorMessage";
import { fileBufferStore } from "../editor/fileBufferStore";
import { fileScrollMemory } from "../editor/fileScrollMemory";
import { languageFor } from "../editor/languageFor";
import { childPath } from "./childPath";
import { dirListingStore } from "./dirListingStore";
import { explorerStore } from "./explorerStore";
import { isInsidePath } from "./isInsidePath";
import { movedPath } from "./movedPath";
import { parentPath } from "./parentPath";

/**
 * Rename a tree row's file or folder on disk. Open tabs on it (or on files under it) follow,
 * with their unsaved edits, undo history and scroll position.
 */
export async function renameTreePath(sessionId: string, from: string, name: string): Promise<void> {
  const to = childPath(parentPath(from), name);
  if (to === from) return;
  try {
    // Loaded first, so buffers, scroll and tabs move in one step once the file has its new name.
    const buffer = fileBufferStore.get(sessionId, from);
    const language = await languageFor(to, buffer?.kind === "text" ? buffer.live.state.sliceDoc() : "");
    await window.birdsong.renameSessionFile(sessionId, from, name);
    for (const file of explorerStore.get(sessionId).openFiles) {
      if (!isInsidePath(file, from)) continue;
      const moved = movedPath(file, from, to);
      fileBufferStore.rename(sessionId, file, moved, file === from ? language : undefined);
      fileScrollMemory.move(sessionId, file, moved);
    }
    explorerStore.movePath(sessionId, from, to);
    dirListingStore.refresh(sessionId, parentPath(from));
  } catch (err) {
    window.alert(ipcErrorMessage(err));
  }
}
