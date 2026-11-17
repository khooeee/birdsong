import * as path from "node:path";
import type { Session } from "../../shared/session";

/** Choose a registered root for tree operations; never let a child root be renamed or deleted. */
export function workingFolderRoot(session: Session, file: string, mutate = false): string {
  const target = path.resolve(session.cwd, file).split(path.sep).join("/");
  const roots = session.workingFolders.map((folder) => folder.path);
  if (mutate && roots.includes(target)) throw new Error("Working folders cannot be renamed or deleted here.");
  const root = roots.filter((folder) => {
    const rel = path.relative(folder, target);
    return rel !== ".." && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel);
  }).sort((a, b) => b.length - a.length)[0];
  if (!root) throw new Error("This path is outside the session's working folders.");
  return root;
}
