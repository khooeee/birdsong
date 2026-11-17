import { memo, useEffect, useRef, useState } from "react";
import type { GitDiffFile, GitDiffScope, GitFilePatch } from "../../../shared/gitDiff";
import { errorMessage } from "../../../shared/errorMessage";
import { openInEditor } from "../explorer/openInEditor";
import { DiffCode } from "./DiffCode";
import { DiffStats } from "./DiffStats";
import { useNearViewport } from "./useNearViewport";
import { gitPatchCache } from "./gitPatchCache";

export const GitDiffCard = memo(function GitDiffCard({
  id, sessionId, root, file, scope, split, collapsed, onCollapse,
}: {
  id: string; sessionId: string; root: string; file: GitDiffFile; scope: GitDiffScope;
  split: boolean; collapsed: boolean;
  onCollapse: (id: string, revision: string) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const near = useNearViewport(ref);
  const [fullContext, setFullContext] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const requestKey = JSON.stringify([sessionId, root, file.path, file.oldPath, scope, file.revision, fullContext, attempt]);
  const [result, setResult] = useState<{ key: string; patch?: GitFilePatch; error?: string }>(() => {
    const patch = gitPatchCache.get(requestKey);
    return patch ? { key: requestKey, patch } : { key: "" };
  });
  const current = result?.key === requestKey ? result : undefined;
  useEffect(() => {
    if (!near || collapsed || current || file.binary) return;
    let cancelled = false;
    void window.birdsong.getGitPatch(sessionId, root, file.path, file.oldPath, scope, fullContext).then(
      (patch) => {
        if (!cancelled) { gitPatchCache.set(requestKey, patch); setResult({ key: requestKey, patch }); }
      },
      (error) => { if (!cancelled) setResult({ key: requestKey, error: errorMessage(error) }); },
    );
    return () => { cancelled = true; };
  }, [near, collapsed, sessionId, root, file.path, file.oldPath, file.binary, scope, fullContext, requestKey, current]);
  return (
    <article id={id} ref={ref} className="git-diff-card" aria-label={file.path}>
      <header className="git-file-header">
        <button type="button" className="git-collapse" aria-label={`${collapsed ? "Expand" : "Collapse"} ${file.path}`}
          aria-expanded={!collapsed} onClick={() => onCollapse(id, file.revision)}>{collapsed ? "▸" : "▾"}</button>
        <DiffStats additions={file.additions} deletions={file.deletions} />
        <span className="git-file-path" title={file.oldPath ? `${file.oldPath} → ${file.path}` : file.path}>
          {file.oldPath ? <><span className="git-old-path">{file.oldPath}</span> → </> : null}{file.path}
        </span>
        <span className={`git-file-status status-${file.status}`}>{file.untracked ? "new" : file.status}</span>
        {file.status !== "D" && <button type="button" className="git-open-file"
          onClick={() => { void openInEditor(sessionId, `${root}/${file.path}`); }}>Open in Files</button>}
      </header>
      {!collapsed && (
        <>
          {file.binary ? <div className="git-file-message">Binary file changed.</div>
            : current?.error ? <div className="git-file-message" role="alert">{current.error} <button type="button"
              onClick={() => setAttempt((value) => value + 1)}>Retry</button></div>
            : current?.patch ? <>
              {current.patch.note && <div className="git-file-message">{current.patch.note}</div>}
              {current.patch.hunks.length > 0 && <DiffCode path={file.path} hunks={current.patch.hunks} split={split} />}
              {(current.patch.hunks.length > 0 || fullContext) && <button type="button" className="git-expand-context"
                onClick={() => setFullContext((value) => !value)}>{fullContext ? "Show changed lines only" : "↕ Expand unchanged lines"}</button>}
            </> : <div className="git-file-message" aria-live="polite">{near ? "Loading diff…" : "Scroll to load diff"}</div>}
        </>
      )}
    </article>
  );
});
