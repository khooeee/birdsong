import { useEffect, useState } from "react";
import type { ActiveTabId } from "../../../shared/activeTabId";

/** Prompt focus via `birdsong:focus-prompt` (Cmd/Ctrl+I). */
export function useSessionFocusShortcuts(activeSessionId: ActiveTabId, blocked: boolean): number {
  const [promptFocus, setPromptFocus] = useState(0);
  const sessionUi = activeSessionId !== null && !blocked;

  useEffect(() => {
    const run = () => {
      if (!sessionUi) return;
      setPromptFocus((n) => n + 1);
    };
    window.addEventListener("birdsong:focus-prompt", run);
    return () => window.removeEventListener("birdsong:focus-prompt", run);
  }, [sessionUi]);

  return promptFocus;
}
