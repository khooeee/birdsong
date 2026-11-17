import * as path from "node:path";

/** Absolute editor identity, so a tab stays open when its working folder leaves the list. */
export function toEditorPath(cwd: string, file: string): string {
  return path.resolve(cwd, file).split(path.sep).join("/");
}
