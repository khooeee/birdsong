import type { GitDiffScope } from "../../shared/gitDiff";

export function gitDiffArgs(scope: GitDiffScope, hasHead: boolean): string[] {
  if (!["all", "staged", "unstaged"].includes(scope)) throw new Error("Unknown diff scope.");
  return ["diff", "--no-ext-diff", "--no-textconv", "--no-color", "--find-renames",
    ...(scope === "staged" ? ["--cached"] : scope === "all" && hasHead ? ["HEAD"] : [])];
}
