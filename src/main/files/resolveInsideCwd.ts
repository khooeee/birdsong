import * as path from "node:path";

/**
 * Absolute path for `relPath` ("" is the root) inside a session's cwd. Rejects `..` escapes;
 * symlinks are followed, like a folder opened in an editor.
 */
export function resolveInsideCwd(cwd: string, relPath: string): string {
  if (!cwd) throw new Error("This session has no project folder.");
  const root = path.resolve(cwd);
  const target = path.resolve(root, relPath);
  const rel = path.relative(root, target);
  // ".." as a whole component: a name like "..notes.md" is still inside.
  const outside = rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel);
  if (outside) throw new Error(`${relPath} is outside the project folder.`);
  return target;
}
