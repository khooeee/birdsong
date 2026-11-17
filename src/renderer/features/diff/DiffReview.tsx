import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { GitDiffScope } from "../../../shared/gitDiff";
import type { WorkingFolder } from "../../../shared/workingFolder";
import { dialogOpen } from "../shortcuts/dialogOpen";
import { modKey } from "../shortcuts/modKey";
import { diffFileId } from "./diffFileId";
import { DiffFileTree } from "./DiffFileTree";
import { DiffStats } from "./DiffStats";
import { DiffToolbar } from "./DiffToolbar";
import { diffViewMemory } from "./diffViewMemory";
import { GitDiffCard } from "./GitDiffCard";
import { useGitDiff } from "./useGitDiff";

export function DiffReview({ sessionId, folders, scope, onScope }: {
  sessionId: string; folders: readonly WorkingFolder[]; scope: GitDiffScope;
  onScope: (scope: GitDiffScope) => void;
}) {
  const memory = diffViewMemory(sessionId);
  const [collapsed, setCollapsed] = useState(memory.collapsed);
  const [selected, setSelected] = useState(memory.selected);
  const [split, setSplit] = useState(memory.split);
  const [wide, setWide] = useState(true);
  const [showTree, setShowTree] = useState(true);
  const [filter, setFilter] = useState("");
  const root = useRef<HTMLElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);
  const { snapshot, error } = useGitDiff(sessionId, folders, scope);
  const restored = useRef(false);
  const repositories = useMemo(() => snapshot?.repositories.map((repo) => ({ ...repo,
    files: repo.files.filter((file) => file.path.toLowerCase().includes(filter.toLowerCase())) })) ?? [], [snapshot, filter]);

  useLayoutEffect(() => {
    if (snapshot && !restored.current && scroll.current) {
      scroll.current.scrollTop = memory.scroll[scope] ?? 0;
      restored.current = true;
    }
  }, [snapshot, memory, scope]);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWide(entry.contentRect.width >= 900));
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const focusFilter = () => { setShowTree(true); requestAnimationFrame(() => filterRef.current?.focus()); };
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || dialogOpen()) return;
      if (modKey(event, "f") || modKey(event, "p")) { event.preventDefault(); focusFilter(); }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("birdsong:find-diff", focusFilter);
    window.addEventListener("birdsong:find", focusFilter);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("birdsong:find-diff", focusFilter);
      window.removeEventListener("birdsong:find", focusFilter);
    };
  }, []);

  const toggleCollapsed = useCallback((id: string, revision: string) => {
    setCollapsed((previous) => {
      const key = `${scope}:${id}`;
      const updated = { ...previous };
      if (previous[key] === revision) delete updated[key];
      else updated[key] = revision;
      memory.collapsed = updated;
      return updated;
    });
  }, [memory, scope]);
  const selectFile = useCallback((id: string) => {
    memory.selected = id;
    setSelected(id);
    document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [memory]);

  return (
    <section className="git-diff-view" ref={root} aria-label="Git diff">
      <DiffToolbar scope={scope} onScope={onScope}
        split={split} wide={wide} showTree={showTree} onTree={() => setShowTree((value) => !value)}
        onSplit={(value) => { memory.split = value; setSplit(value); }} />
      <div className={`git-diff-workspace${showTree ? "" : " no-tree"}`}>
        {showTree && <nav className="git-diff-tree" aria-label="Changed files">
          <div className="git-tree-filter"><input ref={filterRef} type="search" placeholder="Filter changed files…"
            aria-label="Filter changed files" value={filter} onChange={(event) => setFilter(event.target.value)} /></div>
          {repositories.map((repository) => <DiffFileTree key={repository.root} repository={repository}
            selected={selected} onSelect={selectFile} />)}
        </nav>}
        <div className="git-diff-scroll" ref={scroll} onScroll={(event) => {
          if (restored.current) memory.scroll[scope] = event.currentTarget.scrollTop;
        }}>
          {error && <div className="git-diff-error" role="alert">{error}</div>}
          {snapshot?.errors.map((message) => <div className="git-diff-error" key={message}>{message}</div>)}
          {!snapshot && !error && <div className="git-diff-empty" role="status">Loading Git changes…</div>}
          {repositories.map((repository) => <section className="git-repository" key={repository.root}>
            <div className="git-repository-header">
              <strong title={repository.root}>{repository.root.split("/").at(-1)}</strong>
              <span className="git-branch" title={repository.root}>⑂ {repository.branch || "No commits"}</span>
              <span className="git-count">{repository.files.length} {repository.files.length === 1 ? "file" : "files"}</span>
              <DiffStats {...repository.files.reduce((sum, file) => ({ additions: sum.additions + file.additions,
                deletions: sum.deletions + file.deletions }), { additions: 0, deletions: 0 })} />
            </div>
            {!repository.files.length && <div className="git-diff-empty">
              {filter ? "No files match your filter." : scope === "staged" ? "No staged changes." : "No changes to review."}
            </div>}
            {repository.files.map((file) => {
              const id = diffFileId(repository.root, file.path);
              return <GitDiffCard key={file.path} id={id} sessionId={sessionId} root={repository.root} file={file}
                scope={scope} split={split && wide} collapsed={collapsed[`${scope}:${id}`] === file.revision}
                onCollapse={toggleCollapsed} />;
            })}
          </section>)}
        </div>
      </div>
    </section>
  );
}
