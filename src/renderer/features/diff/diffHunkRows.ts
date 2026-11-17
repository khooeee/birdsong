import type { GitDiffLine } from "../../../shared/gitDiff";
import { wordDiffRanges } from "./wordDiffRanges";

interface Row {
  left?: GitDiffLine;
  right?: GitDiffLine;
  leftChanged?: Array<[number, number]>;
  rightChanged?: Array<[number, number]>;
}

export function diffHunkRows(lines: GitDiffLine[], split: boolean): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    if (line.kind === "context" || line.kind === "note") {
      rows.push({ left: line, right: split && line.kind === "context" ? line : undefined });
      i++;
      continue;
    }
    const group: GitDiffLine[] = [];
    while (i < lines.length && lines[i].kind !== "context") group.push(lines[i++]);
    const removed = group.filter((item) => item.kind === "removed");
    const added = group.filter((item) => item.kind === "added");
    const changes = new Map<GitDiffLine, Array<[number, number]>>();
    const pairs: Row[] = [];
    for (let j = 0; j < Math.max(removed.length, added.length); j++) {
      const left = removed[j];
      const right = added[j];
      const words = left && right && j < 200 ? wordDiffRanges(left.text, right.text) : undefined;
      if (words) { changes.set(left, words.before); changes.set(right, words.after); }
      pairs.push({ left, right, leftChanged: words?.before, rightChanged: words?.after });
    }
    if (split) {
      rows.push(...pairs, ...group.filter((item) => item.kind === "note").map((note) => ({ left: note })));
    } else {
      rows.push(...group.map((item) => ({ left: item, leftChanged: changes.get(item) })));
    }
  }
  return rows;
}
