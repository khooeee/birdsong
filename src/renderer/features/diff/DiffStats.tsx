import "./diffStats.css";

export function DiffStats({ additions, deletions,
  title = `${additions} added, ${deletions} deleted. Squares show the proportion of additions and deletions.`,
}: { additions: number; deletions: number; title?: string }) {
  return (
    <span className="git-diff-stats" aria-label={`${additions} additions, ${deletions} deletions`}
      title={title}>
      <span className="git-diff-plus">+{additions.toLocaleString()}</span>
      <span className="git-diff-minus">−{deletions.toLocaleString()}</span>
      <span className="git-diff-stat-blocks" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => <i key={i} className={!additions && !deletions ? ""
          : i < Math.round(5 * additions / (additions + deletions)) ? "plus" : "minus"} />)}
      </span>
    </span>
  );
}
