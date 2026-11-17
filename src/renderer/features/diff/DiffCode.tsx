import { Fragment, memo, useMemo } from "react";
import type { GitDiffHunk, GitDiffLine } from "../../../shared/gitDiff";
import { DiffCodeText } from "./DiffCodeText";
import { diffHunkRows } from "./diffHunkRows";
import { useDiffSyntax } from "./useDiffSyntax";

const marker = (line: GitDiffLine | undefined) => line?.kind === "added" ? "+" : line?.kind === "removed" ? "−" : " ";

export const DiffCode = memo(function DiffCode({ path, hunks, split }: {
  path: string; hunks: GitDiffHunk[]; split: boolean;
}) {
  const syntax = useDiffSyntax(path, hunks);
  const groups = useMemo(() => hunks.map((hunk) => ({ hunk, rows: diffHunkRows(hunk.lines, split) })), [hunks, split]);
  return (
    <div className="git-diff-code-scroll" tabIndex={0} role="region" aria-label={`Changes to ${path}`}>
      <table className={`git-diff-code${split ? " split" : ""}`}>
        <colgroup>
          <col className="git-line-col" /><col className={split ? "git-marker-col" : "git-line-col"} />
          <col className={split ? "git-code-col" : "git-marker-col"} />
          {split ? <><col className="git-line-col" /><col className="git-marker-col" /><col className="git-code-col" /></> : <col />}
        </colgroup>
        <tbody>
          {groups.map(({ hunk, rows }, hunkIndex) => (
            <Fragment key={hunkIndex}>
              <tr className="git-hunk-heading"><td colSpan={split ? 6 : 4}>{hunk.heading}</td></tr>
              {rows.map((row, i) => {
                if (row.left?.kind === "note") return <tr key={i} className="git-diff-note"><td colSpan={split ? 6 : 4}>{row.left.text}</td></tr>;
                if (!split) {
                  const line = row.left!;
                  return (
                    <tr key={i} className={line.kind}>
                      <td className="git-line-number">{line.oldLine}</td><td className="git-line-number">{line.newLine}</td>
                      <td className="git-line-marker" aria-hidden="true">{marker(line)}</td>
                      <td className="git-line-text"><DiffCodeText text={line.text} tokens={syntax.get(line)} changed={row.leftChanged} /></td>
                    </tr>
                  );
                }
                return (
                  <tr key={i}>
                    {(["left", "right"] as const).map((side) => {
                      const line = row[side];
                      const kind = line?.kind ?? "filler";
                      return (
                        <Fragment key={side}>
                          <td className={`git-line-number ${kind}`}>{side === "left" ? line?.oldLine : line?.newLine}</td>
                          <td className={`git-line-marker ${kind}`} aria-hidden="true">{marker(line)}</td>
                          <td className={`git-line-text ${kind}`}><DiffCodeText text={line?.text ?? ""}
                            tokens={line ? syntax.get(line) : undefined} changed={side === "left" ? row.leftChanged : row.rightChanged} /></td>
                        </Fragment>
                      );
                    })}
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
});
