/**
 * `path` as Go to File shows it: relative to the working folder holding it, led by that folder's
 * name when the session has several. A root shows as its name; a path outside every root stays whole.
 */
export function pathLabel(path: string, roots: readonly string[]): string {
  let root: string | undefined;
  for (const candidate of roots) {
    const base = candidate.replace(/\/$/, "");
    if ((path === base || path.startsWith(`${base}/`)) && (root === undefined || base.length > root.length)) root = base;
  }
  if (root === undefined) return path;
  const cut = roots.length > 1 || path === root ? root.lastIndexOf("/") + 1 : root.length + 1;
  return path.slice(cut);
}
