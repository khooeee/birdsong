import type { Session } from "../../../shared/session";
import { FileExplorer } from "./FileExplorer";
import { FilePane } from "./FilePane";
import { startExplorerResize } from "./startExplorerResize";
import "./filesView.css";

/** Files mode's main area: the active session's file explorer beside its editor. */
export function FilesView({ session }: { session: Session | null }) {
  if (!session) {
    return (
      <section className="panel">
        <div className="empty">Select a session to browse its files.</div>
      </section>
    );
  }
  return (
    <div className="files-view">
      <aside className="files-explorer" aria-label="File explorer">
        <div
          className="rail-resize"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize file explorer"
          onPointerDown={startExplorerResize}
        />
        <FileExplorer key={session.id} session={session} />
      </aside>
      <FilePane session={session} />
    </div>
  );
}
