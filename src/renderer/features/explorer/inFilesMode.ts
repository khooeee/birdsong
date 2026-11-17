import { railModeStore } from "./railModeStore";

/** True while the window shows the File Explorer instead of Sessions. */
export function inFilesMode(): boolean {
  return railModeStore.getSnapshot() === "files";
}
