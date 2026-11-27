import type { BrowserWindow } from "electron";
import { copyFile } from "node:fs/promises";
import path from "node:path";
import { imagesDir } from "../storage/userDataPaths";
import { isStoredImageName } from "./isStoredImageName";
import { windowDialog } from "../dialogs/windowDialog";

/** Save-as dialog for a stored transcript image. False when cancelled or `name` isn't a stored image. */
export async function saveImageFile(win: BrowserWindow | null, name: string): Promise<boolean> {
  if (!isStoredImageName(name)) return false;
  const extension = path.extname(name).slice(1);
  const options: Electron.SaveDialogOptions = {
    defaultPath: `image.${extension}`,
    filters: [{ name: "Image", extensions: [extension] }],
    properties: ["createDirectory", "showOverwriteConfirmation"],
  };
  const result = await windowDialog.save(win, options);
  if (result.canceled || !result.filePath) return false;
  await copyFile(path.join(imagesDir(), name), result.filePath);
  return true;
}
