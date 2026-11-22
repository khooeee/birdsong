import { clipboard, ClipboardItem, nativeImage } from "electron";
import path from "node:path";
import { imagesDir } from "../storage/userDataPaths";
import { isStoredImageName } from "./isStoredImageName";

/** Copy a stored transcript image to the clipboard as PNG. False when `name` isn't a stored image. */
export async function copyImageFile(name: string): Promise<boolean> {
  if (!isStoredImageName(name)) return false;
  const image = nativeImage.createFromPath(path.join(imagesDir(), name));
  if (image.isEmpty()) return false;
  const png = image.toPNG();
  const bytes = new Uint8Array(png.byteLength);
  bytes.set(png);
  await clipboard.write([
    new ClipboardItem({ "image/png": new Blob([bytes], { type: "image/png" }) }),
  ]);
  return true;
}
