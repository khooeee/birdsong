import { useCallback, useEffect, useState } from "react";
import type { AgentKind } from "../../../shared/agentKind";
import type { AgentUsage } from "../../../shared/agentUsage";
import { ipcErrorMessage } from "../../../shared/ipcErrorMessage";
import type { UsageAgent } from "../../../shared/usageAgent";

type UsageByAgent = Partial<Record<AgentKind, AgentUsage>>;

/**
 * Reads every agent's usage when the window opens and on `refresh`, with no cache.
 * Agents read in parallel, so each row fills in as soon as its own CLI answers.
 */
export function useAgentUsage() {
  const [revision, setRevision] = useState(0);
  const [agents, setAgents] = useState<UsageAgent[] | null>(null);
  const [usage, setUsage] = useState<UsageByAgent>({});
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    const settle = (kind: AgentKind, result: AgentUsage | undefined) => {
      if (stopped) return;
      if (result) setUsage((prev) => ({ ...prev, [kind]: result }));
      else setAgents((prev) => prev?.filter(({ agent }) => agent !== kind) ?? null);
      setPending((count) => count - 1);
    };
    setUsage({});
    setError(null);
    window.birdsong.usageAgents().then((list) => {
      if (stopped) return;
      setAgents(list);
      setPending(list.length);
      for (const { agent, name } of list) {
        window.birdsong.readAgentUsage(agent).then(
          (result) => settle(agent, result),
          (err) => settle(agent, { agent, name, meters: [], notes: [], error: ipcErrorMessage(err) }),
        );
      }
    }, (err) => {
      if (!stopped) setError(ipcErrorMessage(err));
    });
    return () => { stopped = true; };
  }, [revision]);

  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  return { agents, usage, error, reading: agents === null ? error === null : pending > 0, refresh };
}
