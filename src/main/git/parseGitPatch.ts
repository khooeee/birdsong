import type { GitDiffHunk, GitFilePatch } from "../../shared/gitDiff";

/** Paths come from NUL-delimited metadata, never from the quoted patch headers. */
export function parseGitPatch(patch: string): GitFilePatch {
  const hunks: GitDiffHunk[] = [];
  let hunk: GitDiffHunk | undefined;
  let oldLine = 0;
  let newLine = 0;
  const lines = patch.split("\n");
  if (lines.at(-1) === "") lines.pop();
  for (const line of lines) {
    if (line.startsWith("diff --")) { hunk = undefined; continue; }
    const heading = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (heading) {
      oldLine = Number(heading[1]);
      newLine = Number(heading[2]);
      hunk = { heading: line, lines: [] };
      hunks.push(hunk);
    } else if (hunk) {
      const text = line.slice(1);
      if (line[0] === "+") hunk.lines.push({ kind: "added", text, newLine: newLine++ });
      else if (line[0] === "-") hunk.lines.push({ kind: "removed", text, oldLine: oldLine++ });
      else if (line[0] === " ") hunk.lines.push({ kind: "context", text, oldLine: oldLine++, newLine: newLine++ });
      else if (line[0] === "\\") hunk.lines.push({ kind: "note", text: line });
    }
  }
  const binary = /^(Binary files .* differ|GIT binary patch)$/m.test(patch);
  if (/^diff --(?:cc|combined) /m.test(patch)) return { hunks: [], note: "Unmerged file. Open it in Files to resolve the conflict." };
  return { hunks, note: binary ? "Binary file changed." : !hunks.length ? "No text changes. The file was renamed, its mode changed, or its contents are empty." : undefined };
}
