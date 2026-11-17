import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { GitDiffScope, GitFilePatch } from "../../shared/gitDiff";
import type { WorkingFolder } from "../../shared/workingFolder";
import { gitDiffArgs } from "./gitDiffArgs";
import { runGit } from "./runGit";
import { parseGitPatch } from "./parseGitPatch";

const MAX_BYTES = 2 * 1024 * 1024;

/** Only registered repositories and literal paths can reach Git. Content is fetched per visible file. */
export async function readGitPatch(
  folders: readonly WorkingFolder[], root: string, file: string, oldPath: string | undefined,
  scope: GitDiffScope, fullContext: boolean,
): Promise<GitFilePatch> {
  const roots = await Promise.all(folders.map((folder) =>
    runGit(folder.path, ["rev-parse", "--show-toplevel"]).then((value) => value.replace(/\r?\n$/, "")).catch(() => "")));
  if (!roots.includes(root)) throw new Error("This repository is outside the session's working folders.");
  for (const name of [file, oldPath].filter((value): value is string => value !== undefined)) {
    const relative = path.relative(root, path.resolve(root, name));
    if (!name || path.isAbsolute(name) || relative === ".." || relative.startsWith(`..${path.sep}`)) {
      throw new Error("Invalid diff path.");
    }
  }
  const head = await runGit(root, ["rev-parse", "--verify", "HEAD"]).catch(() => "");
  const args = gitDiffArgs(scope, !!head);
  const untracked = scope !== "staged" && (await runGit(root,
    ["ls-files", "--others", "--exclude-standard", "-z", "--", file])).split("\0").includes(file);
  if (untracked || (!head && scope === "all")) {
    const absolute = path.join(root, file);
    const stat = await fs.lstat(absolute);
    if (stat.size > MAX_BYTES || (!stat.isFile() && !stat.isSymbolicLink())) {
      return { hunks: [], note: "This file is too large to display." };
    }
    const bytes = stat.isSymbolicLink() ? Buffer.from(await fs.readlink(absolute)) : await fs.readFile(absolute);
    if (bytes.subarray(0, 8000).includes(0)) return { hunks: [], note: "Binary file added." };
    const text = bytes.toString("utf8");
    const lines = text.split("\n");
    if (text.endsWith("\n") || !text) lines.pop();
    if (lines.length > 20_000) return { hunks: [], note: "This diff is too large to display. Open the file in Files." };
    const added = lines.map((line, i) => ({ kind: "added" as const, text: line, newLine: i + 1 }));
    return { hunks: lines.length ? [{ heading: `@@ -0,0 +1,${lines.length} @@`, lines: [
      ...added, ...(!text.endsWith("\n") && text ? [{ kind: "note" as const, text: "\\ No newline at end of file" }] : []),
    ] }] : [], note: !text ? "Empty file added." : undefined };
  }
  try {
    const patch = await runGit(root, [...args, `--unified=${fullContext ? 100_000 : 3}`, "--",
      ...(oldPath ? [oldPath] : []), file], MAX_BYTES);
    if (patch.split("\n").length > 20_000) return { hunks: [], note: "This diff is too large to display. Open the file in Files." };
    return parseGitPatch(patch);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") {
      return { hunks: [], note: "This diff is too large to display. Open the file in Files." };
    }
    throw error;
  }
}
