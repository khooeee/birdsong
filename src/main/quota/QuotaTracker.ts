import { powerMonitor } from "electron";
import type { AgentQuota, QuotaAgent } from "../../shared/agentQuota";
import { errorMessage } from "../../shared/errorMessage";
import { fetchClaudeQuota } from "./fetchClaudeQuota";
import { fetchCodexQuota } from "./fetchCodexQuota";
import { fetchCursorQuota } from "./fetchCursorQuota";
import type { QuotaReading } from "./QuotaReading";

const POLL_MS = 5 * 60_000;
/** A turn spends quota; read it again shortly after, coalescing turns that end together. */
const AFTER_TURN_MS = 20_000;
/** Read again this long after a window resets, so the provider has rolled it over. */
const AFTER_RESET_MS = 30_000;

const FETCHERS: [QuotaAgent, () => Promise<QuotaReading | null>][] = [
  ["claude", fetchClaudeQuota],
  ["codex", fetchCodexQuota],
  ["cursor", fetchCursorQuota],
];

type Listener = (quotas: AgentQuota[]) => void;

/**
 * Reads the Claude, Codex and Cursor subscription quotas with the CLIs' own logins: every few minutes,
 * after turns, on wake and when a window resets. A failed read keeps the last numbers with the error.
 */
export class QuotaTracker {
  private quotas: AgentQuota[] = [];
  private listeners = new Set<Listener>();
  private timer: NodeJS.Timeout | null = null;
  private soonTimer: NodeJS.Timeout | null = null;
  private refreshing: Promise<void> | null = null;
  private running = false;

  start(): void {
    this.running = true;
    powerMonitor.on("resume", this.refresh);
    this.refresh();
  }

  stop(): void {
    this.running = false;
    powerMonitor.off("resume", this.refresh);
    if (this.timer) clearTimeout(this.timer);
    if (this.soonTimer) clearTimeout(this.soonTimer);
    this.timer = this.soonTimer = null;
  }

  list(): AgentQuota[] {
    return this.quotas;
  }

  /** Called with every new list; returns an unsubscribe. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** A turn finished: read again shortly. */
  refreshSoon(): void {
    if (!this.running || this.soonTimer) return;
    this.soonTimer = setTimeout(() => {
      this.soonTimer = null;
      this.refresh();
    }, AFTER_TURN_MS);
  }

  private refresh = (): void => {
    if (!this.running || this.refreshing) return;
    this.refreshing = this.readAll().finally(() => {
      this.refreshing = null;
      this.scheduleNext();
    });
  };

  private async readAll(): Promise<void> {
    const results = await Promise.all(FETCHERS.map(([agent, fetch]) => this.read(agent, fetch)));
    this.quotas = results.filter((quota): quota is AgentQuota => quota !== null);
    for (const listener of this.listeners) listener(this.quotas);
  }

  /** Null drops the agent: not installed or not logged in with a subscription. */
  private async read(agent: QuotaAgent, fetch: () => Promise<QuotaReading | null>): Promise<AgentQuota | null> {
    try {
      const reading = await fetch();
      return reading && { agent, ...reading, fetchedAt: Date.now() };
    } catch (error) {
      const previous = this.quotas.find((quota) => quota.agent === agent);
      console.warn(`[quota] ${agent}:`, errorMessage(error));
      return previous ? { ...previous, error: errorMessage(error) } : null;
    }
  }

  private scheduleNext(): void {
    if (!this.running) return;
    const now = Date.now();
    const resets = this.quotas.map((quota) => quota.resetsAt ?? Infinity).filter((at) => at > now);
    const delay = Math.min(POLL_MS, Math.min(...resets) + AFTER_RESET_MS - now);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(this.refresh, Math.max(delay, 1_000));
  }
}
