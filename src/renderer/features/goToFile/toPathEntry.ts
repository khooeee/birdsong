import type { PathEntry } from "./PathEntry";
import { pathLabel } from "./pathLabel";

/** `path` lowercased with every offset kept: a character whose lowercase is longer ("İ") stays as it is. */
function lowerInPlace(path: string): string {
  const lower = path.toLowerCase();
  if (lower.length === path.length) return lower;
  return Array.from(path, (char) => (char.toLowerCase().length === char.length ? char.toLowerCase() : char)).join("");
}

export function toPathEntry(path: string, kind: PathEntry["kind"], roots: readonly string[]): PathEntry {
  const label = pathLabel(path, roots);
  return { path, kind, label, lower: lowerInPlace(label), nameStart: label.lastIndexOf("/") + 1 };
}
