import { useEffect, useState } from "react";
import { errorMessage } from "../../../shared/errorMessage";
import type { FindInFilesResult } from "../../../shared/findInFilesResult";
import type { WorkingFolder } from "../../../shared/workingFolder";

/** Debounced disk search; obsolete requests cannot replace results for a newer query. */
export function useFindInFiles(sessionId: string, folders: WorkingFolder[], query: string, matchCase: boolean) {
  const [result, setResult] = useState<FindInFilesResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => window.birdsong.onSessionFilesChanged((event) => {
    if (event.sessionId === sessionId) setRevision((value) => value + 1);
  }), [sessionId]);

  useEffect(() => {
    let current = true;
    setResult(null);
    setError("");
    setLoading(Boolean(query));
    const timer = window.setTimeout(() => {
      if (!query) return;
      void window.birdsong.findInFiles(sessionId, query, matchCase).then((value) => {
        if (current) setResult(value);
      }).catch((err: unknown) => {
        if (current) setError(errorMessage(err));
      }).finally(() => {
        if (current) setLoading(false);
      });
    }, 180);
    return () => {
      current = false;
      window.clearTimeout(timer);
      void window.birdsong.stopFindInFiles();
    };
  }, [sessionId, folders, query, matchCase, revision]);

  return { result, loading, error };
}
