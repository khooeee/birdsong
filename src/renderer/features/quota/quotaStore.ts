import type { AgentQuota } from "../../../shared/agentQuota";

let quotas: AgentQuota[] = [];
const listeners = new Set<() => void>();
let installed = false;

function set(next: AgentQuota[]): void {
  quotas = next;
  listeners.forEach((listener) => listener());
}

/** Main's agent quotas for `useSyncExternalStore` (rail footer). */
export const quotaStore = {
  subscribe(listener: () => void): () => void {
    if (!installed) {
      installed = true;
      window.birdsong.onQuotasChanged(set);
      void window.birdsong.listQuotas().then(set);
    }
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot(): AgentQuota[] {
    return quotas;
  },
};
