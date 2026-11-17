import { UNTITLED_PREFIX } from "./untitledPrefix";

/** A new tab not saved yet, so with no file to read or write. */
export function isUntitledPath(path: string): boolean {
  return path.startsWith(UNTITLED_PREFIX);
}
