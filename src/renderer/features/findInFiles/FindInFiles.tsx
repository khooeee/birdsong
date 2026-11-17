import { memo, useEffect, useRef, useState } from "react";
import type { WorkingFolder } from "../../../shared/workingFolder";
import { editorNavigation } from "../editor/editorNavigation";
import { explorerStore } from "../explorer/explorerStore";
import { dialogOpen } from "../shortcuts/dialogOpen";
import { useFindInFiles } from "./useFindInFiles";
import "./findInFiles.css";

/** Files mode's working-folder content search. Results stay visible while reading a file. */
export const FindInFiles = memo(function FindInFiles({ sessionId, folders, onClose }: {
  sessionId: string;
  folders: WorkingFolder[];
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const { result, loading, error } = useFindInFiles(sessionId, folders, query, matchCase);

  useEffect(() => {
    const focus = () => {
      if (dialogOpen()) return;
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    focus();
    window.addEventListener("birdsong:find-in-files", focus);
    return () => window.removeEventListener("birdsong:find-in-files", focus);
  }, []);

  let status = "Search text in working folders.";
  if (folders.length === 0) status = "Add a working folder to search files.";
  else if (error) status = error;
  else if (loading) status = "Searching…";
  else if (result) status = result.matchCount
    ? `${result.matchCount}${result.truncated ? "+" : ""} matches in ${result.files.length} files`
    : "No matches found.";

  return (
    <section className="find-in-files" aria-label="Find in Files">
      <div className="explorer-header working-folders-header">
        <span>Find in Files</span>
        <button type="button" onClick={onClose} title="Back to Working Folders" aria-label="Close Find in Files">×</button>
      </div>
      <div className="find-in-files-controls">
        <input ref={inputRef} type="search" value={query} placeholder="Find in files…" aria-label="Find in files"
          spellCheck={false} onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              onClose();
            }
          }} />
        <label><input type="checkbox" checked={matchCase} onChange={(event) => setMatchCase(event.target.checked)} />Match case</label>
      </div>
      <div className="explorer-empty" role="status" aria-live="polite">{status}</div>
      <div className="find-in-files-results" aria-label="Search results" aria-busy={loading}>
        {result?.files.map((file) => (
          <section key={file.path} className="find-in-files-group" aria-label={file.label}>
            <h3 title={file.path}>{file.label}</h3>
            {file.matches.map((hit) => (
              <button type="button" key={`${hit.line}:${hit.column}`} className="find-in-files-match"
                title={`${file.path}:${hit.line}:${hit.column}`} onClick={() => {
                  editorNavigation.request({ sessionId, path: file.path, line: hit.line, column: hit.column, length: hit.length });
                  explorerStore.revealFile(sessionId, file.path);
                }}>
                <span className="find-in-files-line">{hit.line}</span>
                <span className="find-in-files-preview">
                  {hit.preview.slice(0, hit.previewColumn)}
                  <mark>{hit.preview.slice(hit.previewColumn, hit.previewColumn + hit.length)}</mark>
                  {hit.preview.slice(hit.previewColumn + hit.length)}
                </span>
              </button>
            ))}
          </section>
        ))}
      </div>
    </section>
  );
});
