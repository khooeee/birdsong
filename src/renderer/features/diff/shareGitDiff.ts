import type { GitDiffSnapshot } from "../../../shared/gitDiff";

/** Polling preserves file props so unchanged memoized cards keep their DOM and syntax trees. */
export function shareGitDiff(previous: GitDiffSnapshot | null, next: GitDiffSnapshot): GitDiffSnapshot {
  if (!previous) return next;
  const repositories = next.repositories.map((repo) => {
    const old = previous.repositories.find((item) => item.root === repo.root);
    if (!old) return repo;
    const byPath = new Map(old.files.map((file) => [file.path, file]));
    const files = repo.files.map((file) => {
      const before = byPath.get(file.path);
      return before && JSON.stringify(before) === JSON.stringify(file) ? before : file;
    });
    return old.branch === repo.branch && files.length === old.files.length && files.every((file, i) => file === old.files[i])
      ? old : { ...repo, files };
  });
  return repositories.length === previous.repositories.length && repositories.every((repo, i) => repo === previous.repositories[i])
    && JSON.stringify(previous.errors) === JSON.stringify(next.errors) ? previous : { ...next, repositories };
}
