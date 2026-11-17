/** Absolute or relative folders holding a file, outermost first. */
export function ancestorPaths(path: string): string[] {
  const dirs: string[] = path.startsWith("/") && path !== "/" ? ["/"] : [];
  for (let slash = path.indexOf("/", 1); slash >= 0; slash = path.indexOf("/", slash + 1)) {
    dirs.push(path.slice(0, slash));
  }
  return dirs;
}
