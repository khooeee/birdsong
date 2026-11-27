import type { BrowserWindow } from "electron";
import * as path from "node:path";
import { resolveEditorFile } from "./resolveEditorFile";
import { toEditorPath } from "./toEditorPath";
import { windowDialog } from "../dialogs/windowDialog";

/**
 * Save As dialog for the editor, starting at `suggested` (an editor path, or a bare name for an
 * untitled file). Answers with the chosen editor path, nothing written yet; null when cancelled.
 */
export async function pickSaveFile(
  win: BrowserWindow | null,
  cwd: string,
  suggested: string,
): Promise<string | null> {
  const options: Electron.SaveDialogOptions = {
    // Without a project folder a bare name starts where the dialog was last.
    defaultPath: (cwd || path.isAbsolute(suggested)) ? resolveEditorFile(cwd, suggested) : suggested,
    properties: ["createDirectory", "showOverwriteConfirmation"],
  };
  const result = await windowDialog.save(win, options);
  if (result.canceled || !result.filePath) return null;
  return toEditorPath(cwd, result.filePath);
}
