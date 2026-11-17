import { useCallback, useEffect, useState } from "react";
import type { TranscriptTurn } from "../../../shared/transcript";
import { seedComposerDraft } from "../chat/seedComposerDraft";
import { shareById } from "./shareById";
import { shareTurn } from "./shareTurn";
import { upsertTurn } from "./upsertTurn";

/** Load the active session's transcript and keep all opened transcripts live over IPC. */
export function useSessionTranscripts(sessionId: string | undefined) {
  const [transcripts, setTranscripts] = useState<Record<string, TranscriptTurn[]>>({});

  const replaceTranscript = useCallback((sessionId: string, turns: TranscriptTurn[]) => {
    setTranscripts((prev) => {
      const list = prev[sessionId];
      const next = list ? shareById(list, turns, shareTurn) : turns;
      return next === list ? prev : { ...prev, [sessionId]: next };
    });
  }, []);

  useEffect(() => {
    const unsubscribeTurn = window.birdsong.onTranscript(({ sessionId, turn }) => {
      setTranscripts((prev) => {
        const list = prev[sessionId] ?? [];
        const next = upsertTurn(list, turn);
        return next === list ? prev : { ...prev, [sessionId]: next };
      });
    });
    const unsubscribeReset = window.birdsong.onTranscriptReset(({ sessionId, turns, draft }) => {
      if (draft) seedComposerDraft(sessionId, draft);
      replaceTranscript(sessionId, turns);
    });
    return () => {
      unsubscribeTurn();
      unsubscribeReset();
    };
  }, [replaceTranscript]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    void window.birdsong.getTranscript(sessionId).then((turns) => {
      if (cancelled) return;
      replaceTranscript(sessionId, turns);
    });
    return () => { cancelled = true; };
  }, [sessionId, replaceTranscript]);

  return transcripts;
}
