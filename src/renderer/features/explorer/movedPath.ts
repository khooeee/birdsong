import { isInsidePath } from "./isInsidePath";

/** Where `path` ends up once `from` is renamed to `to`: unchanged unless it is `from` or under it. */
export function movedPath(path: string, from: string, to: string): string {
  return isInsidePath(path, from) ? to + path.slice(from.length) : path;
}
