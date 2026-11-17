import { memo, useEffect, useState } from "react";
import { firstLine } from "../sessions/firstLine";
import "./sessionTitle.css";

interface Props {
  sessionId: string;
  cwd: string;
  title: string;
}

/** Resolve the repo once per session folder, independently of streaming transcript updates. */
export const SessionTitle = memo(function SessionTitle({ sessionId, cwd, title }: Props) {
  const [repository, setRepository] = useState<{ sessionId: string; cwd: string; url: string | null } | null>(null);
  useEffect(() => {
    let stale = false;
    void window.birdsong.getGithubRepoUrl(sessionId).then((url) => {
      if (!stale) setRepository({ sessionId, cwd, url });
    }).catch(() => {});
    return () => { stale = true; };
  }, [sessionId, cwd]);

  const url = repository?.sessionId === sessionId && repository.cwd === cwd ? repository.url : null;
  const text = firstLine(title);
  return (
    <h2 title={title}>
      {url ? <a className="session-title-link" href={url} target="_blank" rel="noopener noreferrer"
        data-tooltip={`Open ${url}`}>{text}</a> : text}
    </h2>
  );
});
