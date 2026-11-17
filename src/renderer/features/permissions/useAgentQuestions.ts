import { useEffect, useState } from "react";
import type { CursorAskQuestionRequest } from "../../../shared/agentRequests";

export function useAgentQuestions(sessionId: string | null): CursorAskQuestionRequest | null {
  const [questions, setQuestions] = useState<CursorAskQuestionRequest[]>([]);
  useEffect(() => {
    const unsubscribe = window.birdsong.onAskQuestion((request) => {
      setQuestions((previous) => [...previous, request]);
    });
    const unsubscribeSettled = window.birdsong.onQuestionSettled(({ requestId }) => {
      setQuestions((previous) => previous.filter((request) => request.requestId !== requestId));
    });
    return () => { unsubscribe(); unsubscribeSettled(); };
  }, []);
  return questions.find((request) => request.sessionId === sessionId) ?? null;
}
