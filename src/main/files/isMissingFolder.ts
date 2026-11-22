import * as fs from "node:fs/promises";
import * as path from "node:path";

/** True when nothing exists at the absolute path `cwd`, so it can be created as a folder. */
export async function isMissingFolder(cwd: string): Promise<boolean> {
  if (!path.isAbsolute(cwd)) return false;
  try {
    await fs.stat(cwd);
    return false;
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === "ENOENT";
  }
}
