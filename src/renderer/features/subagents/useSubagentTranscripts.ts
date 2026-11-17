import { useCallback, useEffect, useState } from "react";
import { mergeTurnsById } from "../../../shared/mergeTurnsById";
import type { TranscriptTurn } from "../../../shared/transcript";
import { shareById } from "../sessions/shareById";
import { shareTurn } from "../sessions/shareTurn";
import { upsertTurn } from "../sessions/upsertTurn";
import { subagentKey } from "./subagentKey";

const NO_TURNS: TranscriptTurn[] = [];

/**
 * Subagent transcripts by `subagentKey`, tracked from the first open and then kept live over IPC.
 * Turns streamed for subagents nobody opened are skipped; opening loads the saved copy.
 */
export function useSubagentTranscripts() {
  const [subagentTranscripts, setSubagentTranscripts] = useState<Record<string, TranscriptTurn[]>>({});
  const [loadingSubagents, setLoadingSubagents] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(
    () =>
      window.birdsong.onSubagentTurn(({ sessionId, subagentId, turn }) => {
        const key = subagentKey(sessionId, subagentId);
        setSubagentTranscripts((prev) => {
          const list = prev[key];
          if (!list) return prev;
          const next = upsertTurn(list, turn);
          return next === list ? prev : { ...prev, [key]: next };
        });
      }),
    [],
  );

  const loadSubagentTranscript = useCallback((sessionId: string, subagentId: string) => {
    const key = subagentKey(sessionId, subagentId);
    // Start tracking now so turns pushed while the request is in flight are kept.
    setSubagentTranscripts((prev) => (prev[key] ? prev : { ...prev, [key]: NO_TURNS }));
    setLoadingSubagents((prev) => new Set(prev).add(key));
    void window.birdsong
      .getSubagentTranscript(sessionId, subagentId)
      .then((saved) => {
        setSubagentTranscripts((prev) => {
          // Pushed turns are newer than the saved copy.
          const list = prev[key] ?? NO_TURNS;
          const next = shareById(list, mergeTurnsById(saved, list), shareTurn);
          return next === list ? prev : { ...prev, [key]: next };
        });
      }, console.error)
      .finally(() => {
        setLoadingSubagents((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      });
  }, []);

  return { subagentTranscripts, loadingSubagents, loadSubagentTranscript };
}
