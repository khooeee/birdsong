import type { GitDiffScope } from "../../../shared/gitDiff";

export function DiffToolbar({ scope, split, wide, showTree,
  onScope, onSplit, onTree }: {
  scope: GitDiffScope;
  split: boolean; wide: boolean; showTree: boolean;
  onScope: (scope: GitDiffScope) => void; onSplit: (split: boolean) => void;
  onTree: () => void;
}) {
  return (
    <div className="git-diff-toolbar">
        <button type="button" aria-label={showTree ? "Hide file tree" : "Show file tree"}
          data-tooltip={showTree ? "Hide file tree" : "Show file tree"} data-tooltip-align="center"
          aria-pressed={showTree} onClick={onTree}>☷</button>
        <div className="git-scope-tabs" role="group" aria-label="Changes to review">
          {(["all", "staged", "unstaged"] as const).map((value) => <button type="button" key={value}
            aria-pressed={scope === value} onClick={() => onScope(value)}
            title={value === "all" ? "git diff HEAD + untracked files" : value === "staged" ? "git diff --cached" : "git diff + untracked files"}>
            {value === "all" ? "All changes" : value === "staged" ? "Staged" : "Unstaged"}</button>)}
        </div>
        <span className="git-diff-comparison">{scope === "all" ? "HEAD → Working tree" : scope === "staged" ? "HEAD → Index" : "Index → Working tree"}</span>
        <div className="git-layout-toggle" role="group" aria-label="Diff layout">
          <button type="button" aria-pressed={!split || !wide} onClick={() => onSplit(false)}>Unified</button>
          <button type="button" aria-pressed={split && wide} disabled={!wide}
            title={wide ? "Show changes side by side" : "Widen the window to use split view"} onClick={() => onSplit(true)}>Split</button>
        </div>
    </div>
  );
}
