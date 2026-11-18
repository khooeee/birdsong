import { useEffect, useState } from "react";
import type { AgentKind } from "../../../shared/agentKind";
import type { ConfigMenuCategory } from "../../../shared/configMenuCategory";
import type { SessionConfigSelect } from "../../../shared/sessionConfigSelect";
import { errorMessage } from "../../../shared/errorMessage";

type DraftState = {
  id: string;
  agent: AgentKind;
  cwd: string;
  options: SessionConfigSelect[] | null;
  updating: boolean;
  error?: string;
};

export function useNewSessionDraft(agent: AgentKind | undefined, cwd: string) {
  const [state, setState] = useState<DraftState | null>(null);
  const draft = state?.agent === agent && state?.cwd === cwd ? state : null;

  useEffect(() => {
    if (!agent || !cwd.trim()) return;
    const id = crypto.randomUUID();
    const initial = { id, agent, cwd, options: null, updating: false };
    let active = true;
    let started = false;
    const finish = (result: Partial<DraftState>) => {
      if (active) setState({ ...initial, ...result });
    };
    setState(initial);
    // Wait for folder edits to settle before starting an agent process.
    const timer = setTimeout(() => {
      started = true;
      void window.birdsong.startSessionDraft(id, agent, cwd).then(
        (options) => finish({ options }),
        (error) => finish({ error: errorMessage(error) }),
      );
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
      if (started) void window.birdsong.discardSessionDraft(id).catch(() => undefined);
    };
  }, [agent, cwd]);

  const select = async (category: ConfigMenuCategory, value: string) => {
    if (!draft?.options || draft.updating) return;
    const update = (result: Partial<DraftState>) => {
      setState((current) => current?.id === draft.id ? { ...current, ...result } : current);
    };
    update({ updating: true, error: undefined });
    try {
      const options = await window.birdsong.selectSessionDraftConfig(draft.id, category, value);
      update({ options });
    } catch (error) {
      update({ error: errorMessage(error) });
    } finally {
      update({ updating: false });
    }
  };

  return {
    id: draft?.options ? draft.id : undefined,
    options: draft?.options ?? [],
    loading: !!agent && !!cwd.trim() && !draft?.options && !draft?.error,
    updating: draft?.updating ?? false,
    error: draft?.error,
    select,
  };
}
