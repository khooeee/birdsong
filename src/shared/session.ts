import type { WorkingFolder } from "./workingFolder";
import type { AgentKind } from "./agentKind";

export type SessionStatus = "idle" | "connecting" | "ready" | "running" | "error";

export interface SessionUsage {
  used: number;
  size: number;
  cost?: { amount: number; currency: string };
}

/** Display names and restorable ACP values of the current model and reasoning effort. */
export interface SessionModelConfig {
  model?: string;
  effort?: string;
  modelValue?: string;
  effortValue?: string;
}

export interface SlashCommand {
  name: string;
  description: string;
  hint?: string;
}

export interface Session {
  id: string;
  title: string;
  agent: AgentKind;
  cwd: string;
  /** Ordered roots shown in Files mode, independent of the agent's starting cwd. */
  workingFolders: WorkingFolder[];
  /** ACP agent session id (not the Birdsong session folder id). */
  agentSessionId: string | null;
  status: SessionStatus;
  supportsSteering?: boolean;
  /** Agent supports ACP `session/fork` (assumed until an agent of this kind connects). */
  supportsFork?: boolean;
  /** Fork can drop agent history after a transcript message, not just copy all of it. */
  supportsForkAtMessage?: boolean;
  error: string | null;
  createdAt: number;
  /** ACP slash commands advertised by the agent for this session. */
  slashCommands?: SlashCommand[];
  /** Context window usage from ACP usage_update (persisted in session meta). */
  usage?: SessionUsage;
  /** Current model and effort from ACP config options (persisted in session meta). */
  modelConfig?: SessionModelConfig;
  /** Started by a cron run (persisted); forks of it are the user's own. */
  cron?: boolean;
  /** Take the agent's generated title (persisted); cleared when the user renames the session. */
  autoTitle?: boolean;
  /** When to continue a turn its usage limit stopped (epoch ms, persisted); the next prompt or a stop clears it. */
  resumeAt?: number;
  /** A turn finished while the session was off screen; opening it on the Mac or the phone clears this (not persisted). */
  unread?: boolean;
  /** The Home session: always first in the rail and never closed or unpinned (set in lists, not persisted). */
  home?: boolean;
}
