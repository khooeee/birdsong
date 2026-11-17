import * as fs from "node:fs/promises";
import * as path from "node:path";
import { resolveInsideCwd } from "./resolveInsideCwd";

/** Give a file or folder under the session cwd a new name in the same folder. Refuses a name already taken. */
export async function renameSessionFile(cwd: string, relPath: string, name: string): Promise<void> {
  if (!name || name === "." || name === ".." || path.basename(name) !== name) {
    throw new Error(`"${name}" is not a valid name.`);
  }
  const from = resolveInsideCwd(cwd, relPath);
  if (from === path.resolve(cwd)) throw new Error("The project folder itself cannot be renamed.");
  const to = path.join(path.dirname(from), name);
  const [source, taken] = await Promise.all([fs.lstat(from), fs.lstat(to).catch(() => null)]);
  // The same inode is this very file: only the letter case changes, on a case-insensitive disk.
  if (taken && (taken.ino !== source.ino || taken.dev !== source.dev)) {
    throw new Error(`"${name}" already exists in this folder.`);
  }
  await fs.rename(from, to);
}
