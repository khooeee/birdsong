import * as fs from "node:fs/promises";
import * as path from "node:path";

/** Resolve symlinks before comparing roots; new registrations must be existing directories. */
export async function canonicalFolderPath(folder: string, cwd: string): Promise<string> {
  if (!folder.trim()) throw new Error("path is required");
  const target = await fs.realpath(path.resolve(cwd, folder));
  if (!(await fs.stat(target)).isDirectory()) throw new Error("Working folder must be a directory.");
  return target.split(path.sep).join("/");
}
