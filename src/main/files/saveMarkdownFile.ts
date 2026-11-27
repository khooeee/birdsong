import type { BrowserWindow } from "electron";
import { writeFileAtomic } from "../storage/writeFileAtomic";
import { markdownFileName } from "./markdownFileName";
import { windowDialog } from "../dialogs/windowDialog";

/** Save-as dialog for markdown; the default name comes from `nameHint` (else `text`). False when cancelled. */
export async function saveMarkdownFile(
  win: BrowserWindow | null,
  text: string,
  nameHint?: string,
): Promise<boolean> {
  const options: Electron.SaveDialogOptions = {
    defaultPath: markdownFileName(nameHint || text),
    filters: [{ name: "Markdown", extensions: ["md"] }],
    properties: ["createDirectory", "showOverwriteConfirmation"],
  };
  const result = await windowDialog.save(win, options);
  if (result.canceled || !result.filePath) return false;
  await writeFileAtomic(result.filePath, text.endsWith("\n") ? text : `${text}\n`);
  return true;
}
