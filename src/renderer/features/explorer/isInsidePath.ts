/** Whether `path` is `root` or lies under it: "src/a.ts" is inside "src". */
export function isInsidePath(path: string, root: string): boolean {
  return path === root || path.startsWith(`${root}/`);
}
