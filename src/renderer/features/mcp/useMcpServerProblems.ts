import { useEffect, useState } from "react";
import { ipcErrorMessage } from "../../../shared/ipcErrorMessage";

const CHECK_DELAY_MS = 400;

/** Problems with mcp.json text, checked once typing pauses. */
export function useMcpServerProblems(text: string): string[] {
  const [problems, setProblems] = useState<string[]>([]);

  useEffect(() => {
    let stopped = false;
    const show = (next: string[]) => {
      if (!stopped) setProblems(next);
    };
    const timer = setTimeout(() => {
      window.birdsong.checkMcpServers(text).then(show, (error) => show([ipcErrorMessage(error)]));
    }, CHECK_DELAY_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [text]);

  return problems;
}
