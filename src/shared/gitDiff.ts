export type GitDiffScope = "all" | "staged" | "unstaged";

export interface GitDiffFile {
  path: string;
  oldPath?: string;
  status: string;
  additions: number;
  deletions: number;
  binary: boolean;
  untracked: boolean;
  revision: string;
}

export interface GitDiffRepository {
  root: string;
  branch: string;
  files: GitDiffFile[];
}

export interface GitDiffSnapshot {
  repositories: GitDiffRepository[];
  errors: string[];
}

export interface GitDiffLine {
  kind: "context" | "added" | "removed" | "note";
  text: string;
  oldLine?: number;
  newLine?: number;
}

export interface GitDiffHunk {
  heading: string;
  lines: GitDiffLine[];
}

export interface GitFilePatch {
  hunks: GitDiffHunk[];
  note?: string;
}
