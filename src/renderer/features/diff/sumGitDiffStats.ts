import type { GitDiffSnapshot } from "../../../shared/gitDiff";

/** Repositories are already deduplicated by worktree root in the main process. */
export function sumGitDiffStats(snapshot: GitDiffSnapshot) {
  let additions = 0;
  let deletions = 0;
  for (const repository of snapshot.repositories) {
    for (const file of repository.files) {
      additions += file.additions;
      deletions += file.deletions;
    }
  }
  return { additions, deletions };
}
