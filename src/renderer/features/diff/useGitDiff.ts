import { useEffect, useState } from "react";
import type { GitDiffScope, GitDiffSnapshot } from "../../../shared/gitDiff";
import type { WorkingFolder } from "../../../shared/workingFolder";
import { errorMessage } from "../../../shared/errorMessage";
import { shareGitDiff } from "./shareGitDiff";

const cache = new Map<string, GitDiffSnapshot>();

/** Watches working files and polls Git metadata while a diff consumer is visible. */
export function useGitDiff(sessionId: string, folders: readonly WorkingFolder[], scope: GitDiffScope) {
  const foldersKey = folders.map((folder) => folder.path).join("\0");
  const key = `${sessionId}:${scope}:${foldersKey}`;
  const [snapshot, setSnapshot] = useState<GitDiffSnapshot | null>(() => cache.get(key) ?? null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stopped = false;
    let busy = false;
    let pending = false;
    let debounce: ReturnType<typeof setTimeout>;
    setSnapshot(cache.get(key) ?? null);
    setError("");
    const load = async () => {
      if (stopped) return;
      if (busy) { pending = true; return; }
      busy = true;
      try {
        const next = await window.birdsong.getGitDiff(sessionId, scope);
        if (stopped) return;
        const shared = shareGitDiff(cache.get(key) ?? null, next);
        cache.set(key, shared);
        setSnapshot(shared);
        setError("");
      } catch (err) { if (!stopped) setError(errorMessage(err)); }
      finally {
        busy = false;
        if (pending && !stopped) { pending = false; void load(); }
      }
    };
    const queue = () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => { void load(); }, 200);
    };
    const off = window.birdsong.onSessionFilesChanged((event) => {
      if (event.sessionId === sessionId) queue();
    });
    void window.birdsong.watchSessionFiles(sessionId).catch(() => {});
    void load();
    // The existing file watcher deliberately skips .git; also cover staging and branch switches.
    const poll = setInterval(() => { if (!document.hidden) void load(); }, 3000);
    window.addEventListener("focus", queue);
    window.addEventListener("birdsong:refresh-diff", queue);
    return () => {
      stopped = true;
      clearTimeout(debounce);
      clearInterval(poll);
      off();
      void window.birdsong.unwatchSessionFiles(sessionId);
      window.removeEventListener("focus", queue);
      window.removeEventListener("birdsong:refresh-diff", queue);
    };
  }, [key, sessionId, scope, foldersKey]);

  return { snapshot, error };
}
