import { errorMessage } from "../../../shared/errorMessage";
import { explorerStore } from "../explorer/explorerStore";
import { baseName } from "./baseName";
import { fileBufferStore } from "./fileBufferStore";
import { fileScrollMemory } from "./fileScrollMemory";
import { isUntitledPath } from "./isUntitledPath";
import { languageFor } from "./languageFor";

/**
 * Save As: ask where to write a tab's text, then turn the tab into that file, with its undo
 * history, cursor and scroll position. The file left behind keeps what it had on disk.
 * Answers with the new path, or null when cancelled or the write failed.
 */
export async function saveFileAs(sessionId: string, path: string): Promise<string | null> {
  const buffer = fileBufferStore.get(sessionId, path);
  if (buffer?.kind !== "text") return null;
  const { state } = buffer.live;
  try {
    const suggested = isUntitledPath(path) ? baseName(path) : path;
    const to = await window.birdsong.pickSaveFile(sessionId, suggested);
    if (to === null) return null;
    // The dialog asked about replacing the file on disk, not the edits waiting in its tab.
    const losesEdits = to !== path && fileBufferStore.isDirty(sessionId, to);
    if (losesEdits && !window.confirm(`${baseName(to)} is open with unsaved changes. Replace it and lose them?`)) {
      return null;
    }
    const written = await window.birdsong.writeSessionFile(sessionId, to, state.sliceDoc(), null);
    if (!written.ok) return null;
    const language = await languageFor(to, buffer.live.state.sliceDoc());
    // Buffer, scroll and tab move in one step, so the editor never renders the tab without its buffer.
    fileBufferStore.moveTo(sessionId, path, to, state.doc, written.mtimeMs, language);
    if (to !== path) {
      fileScrollMemory.move(sessionId, path, to);
      explorerStore.renameFile(sessionId, path, to);
    }
    return to;
  } catch (err) {
    console.error(`[editor] save as ${path} failed:`, errorMessage(err));
    return null;
  }
}
