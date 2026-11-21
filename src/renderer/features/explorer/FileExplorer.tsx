import { useCallback, useEffect, useState } from "react";
import type { Session } from "../../../shared/session";
import { FindInFiles } from "../findInFiles/FindInFiles";
import { modLabel } from "../shortcuts/modLabel";
import { dialogOpen } from "../shortcuts/dialogOpen";
import { FileTree } from "./FileTree";
import { useExplorerRestored } from "./useExplorerRestored";
import { useWorkingFolderActions } from "./useWorkingFolderActions";
import { useSessionFileWatch } from "./useSessionFileWatch";
import "./explorer.css";

/** The session's ordered working folders and their files. Key it by session id. */
export function FileExplorer({ session }: { session: Session }) {
  const restored = useExplorerRestored(session.id);
  useSessionFileWatch(session.id, session.workingFolders);
  const { add, locate, remove, move, picking, error } = useWorkingFolderActions(session.id, session.cwd);
  const [searching, setSearching] = useState(false);
  const closeSearch = useCallback(() => setSearching(false), []);
  const openSearch = useCallback(() => {
    if (!dialogOpen()) setSearching(true);
  }, []);
  useEffect(() => {
    window.addEventListener("birdsong:find-in-files", openSearch);
    return () => window.removeEventListener("birdsong:find-in-files", openSearch);
  }, [openSearch]);
  if (searching) return <FindInFiles sessionId={session.id} folders={session.workingFolders} onClose={closeSearch} />;
  return (
    <div className="explorer">
      <div className="explorer-header working-folders-header">
        <span>Working Folders</span>
        <div className="explorer-header-actions">
          <button type="button" onClick={openSearch} title={`Find in Files (${modLabel("F", true)})`} aria-label="Find in Files">Find</button>
          <button type="button" onClick={add} disabled={picking} title="Add Working Folder" aria-label="Add Working Folder">+</button>
        </div>
      </div>
      {error ? <div className="explorer-empty" role="alert">{error}</div> : null}
      {session.workingFolders.length === 0 ? <div className="explorer-empty">Add a working folder to browse files.</div> : null}
      {restored ? (
        <FileTree sessionId={session.id} folders={session.workingFolders} picking={picking} onLocate={locate} onRemove={remove} onMove={move} />
      ) : null}
    </div>
  );
}
