import { ipcErrorMessage } from "../../../shared/ipcErrorMessage";
import { fileBufferStore } from "../editor/fileBufferStore";
import { fileScrollMemory } from "../editor/fileScrollMemory";
import { dirListingStore } from "./dirListingStore";
import { explorerStore } from "./explorerStore";
import { isInsidePath } from "./isInsidePath";
import { parentPath } from "./parentPath";

/** Move a tree row's file or folder to the Trash (after asking) and close the tabs open on it. */
export async function deleteTreePath(sessionId: string, path: string): Promise<void> {
  const inside = (file: string) => isInsidePath(file, path);
  try {
    const unsaved = explorerStore.get(sessionId).openFiles.some(
      (file) => inside(file) && fileBufferStore.isDirty(sessionId, file),
    );
    if (!(await window.birdsong.trashSessionFile(sessionId, path, unsaved))) return;
    const { openFiles, selected } = explorerStore.get(sessionId);
    for (const file of openFiles.filter(inside)) {
      explorerStore.closeFile(sessionId, file);
      fileBufferStore.drop(sessionId, file);
      fileScrollMemory.delete(sessionId, file);
    }
    if (selected !== null && inside(selected)) explorerStore.select(sessionId, null);
    dirListingStore.refresh(sessionId, parentPath(path));
  } catch (err) {
    window.alert(ipcErrorMessage(err));
  }
}
