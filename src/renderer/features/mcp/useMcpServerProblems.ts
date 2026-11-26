import { useEffect, useState } from "react";
import { ipcErrorMessage } from "../../../shared/ipcErrorMessage";
import type { McpProblem } from "../../../shared/mcpProblem";

const CHECK_DELAY_MS = 400;

/** Problems with mcp.json text, checked once typing pauses. */
export function useMcpServerProblems(text: string): McpProblem[] {
  const [problems, setProblems] = useState<McpProblem[]>([]);

  useEffect(() => {
    let stopped = false;
    const show = (next: McpProblem[]) => {
      if (!stopped) setProblems(next);
    };
    const timer = setTimeout(() => {
      window.birdsong.checkMcpServers(text).then(show, (error) => show([{ server: null, message: ipcErrorMessage(error) }]));
    }, CHECK_DELAY_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [text]);

  return problems;
}
