import { memo, useState } from "react";
import type { Session } from "../../../shared/session";
import { diffViewMemory } from "./diffViewMemory";
import { DiffReview } from "./DiffReview";
import "./diffView.css";
import "./diffCode.css";

const SessionDiff = memo(function SessionDiff({ sessionId, folders }: {
  sessionId: string; folders: Session["workingFolders"];
}) {
  const memory = diffViewMemory(sessionId);
  const [scope, setScope] = useState(memory.scope);
  return <DiffReview key={scope} sessionId={sessionId} folders={folders} scope={scope}
    onScope={(next) => { memory.scope = next; setScope(next); }} />;
});

export function DiffView({ session }: { session: Session | null }) {
  return session ? <SessionDiff key={session.id} sessionId={session.id} folders={session.workingFolders} />
    : <section className="panel"><div className="empty">Select a session to review Git changes.</div></section>;
}
