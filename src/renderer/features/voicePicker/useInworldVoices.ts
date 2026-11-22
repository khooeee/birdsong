import { useCallback, useEffect, useState } from "react";
import type { InworldVoice } from "../../../shared/inworldVoice";
import { ipcErrorMessage } from "../../../shared/ipcErrorMessage";

type State = { voices: InworldVoice[]; loading: boolean; error: string | null };

/** The saved key's Inworld voices (main caches them); `enabled` false while there is no key. */
export function useInworldVoices(enabled: boolean) {
  const [state, setState] = useState<State>({ voices: [], loading: false, error: null });

  const load = useCallback((refresh: boolean) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    window.birdsong.listVoices(refresh).then(
      (voices) => setState({ voices, loading: false, error: null }),
      (error: unknown) => setState((prev) => ({ ...prev, loading: false, error: ipcErrorMessage(error) })),
    );
  }, []);

  useEffect(() => {
    if (enabled) load(false);
  }, [enabled, load]);

  const refresh = useCallback(() => load(true), [load]);
  return { ...state, refresh };
}
