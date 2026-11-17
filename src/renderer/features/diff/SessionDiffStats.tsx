import { memo } from "react";
import type { WorkingFolder } from "../../../shared/workingFolder";
import { railModeStore } from "../explorer/railModeStore";
import { useRailMode } from "../explorer/useRailMode";
import { DiffStats } from "./DiffStats";
import { sumGitDiffStats } from "./sumGitDiffStats";
import { useGitDiff } from "./useGitDiff";
import "./sessionDiffStats.css";

interface Props {
  sessionId: string;
  folders: readonly WorkingFolder[];
}

function WorkingFolderDiffStats({ sessionId, folders }: Props) {
  const { snapshot, error } = useGitDiff(sessionId, folders, "all");
  if (!snapshot && !error) return null;
  if (snapshot && !snapshot.repositories.length && !error) return null;
  const problems = [error, ...(snapshot?.errors ?? [])].filter(Boolean);
  const totals = snapshot ? sumGitDiffStats(snapshot) : null;
  const label = totals ? `${totals.additions} additions, ${totals.deletions} deletions` : "Diff unavailable";
  const tooltip = ["Go to diff",
    ...(problems.length ? ["Totals may be incomplete or out of date.", ...problems] : [])].join("\n");

  return (
    <button type="button" className="session-diff-stats"
      data-tooltip={tooltip} data-tooltip-align="end"
      aria-label={`Review changes across all working folders: ${label}${problems.length ? ". Totals may be incomplete or out of date" : ""}`}
      onClick={() => railModeStore.set("diff")}>
      {totals ? <DiffStats {...totals} title="" /> : "Diff unavailable"}
      {problems.length ? <span className="session-diff-warning" aria-hidden="true">!</span> : null}
    </button>
  );
}

/** Keep polling out of hidden chat panels and isolate updates from the transcript. */
export const SessionDiffStats = memo(function SessionDiffStats(props: Props) {
  const mode = useRailMode();
  return mode === "sessions" ? <WorkingFolderDiffStats
    key={`${props.sessionId}:${props.folders.map((folder) => folder.path).join("\0")}`} {...props} /> : null;
});
