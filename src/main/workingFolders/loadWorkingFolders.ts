import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { WorkingFolder } from "../../shared/workingFolder";
import { isRecord } from "../../shared/isRecord";

/** Upgrade old sessions once. Saved canonical paths stay pinned, even when a folder is missing. */
export async function loadWorkingFolders(value: unknown, cwd: string): Promise<WorkingFolder[]> {
  if (!Array.isArray(value)) {
    if (!cwd) return [];
    return [{ id: "session", path: (await fs.realpath(cwd).catch(() => path.resolve(cwd))).split(path.sep).join("/") }];
  }
  const ids = new Set<string>();
  const paths = new Set<string>();
  return value.filter((folder): folder is WorkingFolder => {
    if (!isRecord(folder) || typeof folder.id !== "string" || !folder.id
      || typeof folder.path !== "string" || !path.isAbsolute(folder.path)) return false;
    if (ids.has(folder.id) || paths.has(folder.path)) return false;
    ids.add(folder.id);
    paths.add(folder.path);
    return true;
  }).map(({ id, path: folderPath }) => ({ id, path: folderPath }));
}
