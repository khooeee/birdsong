import { useEffect, useState } from "react";
import { LanguageDescription } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { classHighlighter, highlightCode } from "@lezer/highlight";
import type { GitDiffHunk, GitDiffLine } from "../../../shared/gitDiff";

interface Token { from: number; to: number; className: string }
const EMPTY = new Map<GitDiffLine, Token[]>();

/** Parse each side of a hunk together, preserving multi-line strings and comments. */
export function useDiffSyntax(path: string, hunks: GitDiffHunk[]) {
  const [syntax, setSyntax] = useState(EMPTY);
  useEffect(() => {
    let cancelled = false;
    setSyntax(EMPTY);
    const description = LanguageDescription.matchFilename(languages, path.split("/").at(-1) ?? path);
    if (!description) return;
    void description.load().then(({ language }) => {
      if (cancelled) return;
      const tokens = new Map<GitDiffLine, Token[]>();
      for (const hunk of hunks) {
        for (const side of ["before", "after"]) {
          const lines = hunk.lines.filter((line) => line.kind !== "note"
            && line.kind !== (side === "before" ? "added" : "removed"));
          const code = lines.map((line) => line.text).join("\n");
          if (code.length > 200_000) continue;
          let index = 0;
          let offset = 0;
          highlightCode(code, language.parser.parse(code), classHighlighter, (text, className) => {
            const line = lines[index];
            if (line && className) {
              const spans = tokens.get(line) ?? [];
              spans.push({ from: offset, to: offset + text.length, className });
              tokens.set(line, spans);
            }
            offset += text.length;
          }, () => { index++; offset = 0; });
        }
      }
      if (!cancelled) setSyntax(tokens);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [path, hunks]);
  return syntax;
}
