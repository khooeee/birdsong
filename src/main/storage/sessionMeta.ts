import type { WorkingFolder } from "../../shared/workingFolder";
import { loadWorkingFolders } from "../workingFolders/loadWorkingFolders";
import * as fs from "node:fs/promises";
import { isAgentKind, type AgentKind } from "../../shared/agentKind";
import type { SessionModelConfig, SessionUsage } from "../../shared/session";
import { isMissingFile } from "./isMissingFile";
import { sessionMetaPath } from "./userDataPaths";
import { writeFileAtomic } from "./writeFileAtomic";

export interface SessionMeta {
  title: string;
  agent: AgentKind;
  cwd: string;
  workingFolders: WorkingFolder[];
  agentSessionId: string | null;
  usage?: SessionUsage;
  modelConfig?: SessionModelConfig;
  cron?: boolean;
  autoTitle?: boolean;
  resumeAt?: number;
}

function readUsage(value: unknown): SessionUsage | undefined {
  if (!value || typeof value !== "object") return undefined;
  const used = (value as SessionUsage).used;
  const size = (value as SessionUsage).size;
  if (!Number.isFinite(used) || !Number.isFinite(size)) return undefined;
  const cost = (value as SessionUsage).cost;
  return {
    used,
    size,
    cost:
      cost && Number.isFinite(cost.amount) && typeof cost.currency === "string"
        ? { amount: cost.amount, currency: cost.currency }
        : undefined,
  };
}

function readModelConfig(value: unknown): SessionModelConfig | undefined {
  if (!value || typeof value !== "object") return undefined;
  const { model, effort, modelValue, effortValue } = value as SessionModelConfig;
  return {
    model: typeof model === "string" ? model : undefined,
    effort: typeof effort === "string" ? effort : undefined,
    modelValue: typeof modelValue === "string" ? modelValue : undefined,
    effortValue: typeof effortValue === "string" ? effortValue : undefined,
  };
}

export async function loadSessionMeta(sessionId: string): Promise<SessionMeta | null> {
  try {
    const raw = await fs.readFile(sessionMetaPath(sessionId), "utf8");
    if (!raw.trim()) return null;
    const parsed = JSON.parse(raw) as SessionMeta;
    // A session of an agent Birdsong no longer runs (e.g. Prime Agent) cannot reopen.
    if (!isAgentKind(parsed.agent)) return null;
    const meta: SessionMeta = {
      title: parsed.title,
      agent: parsed.agent,
      cwd: parsed.cwd,
      workingFolders: await loadWorkingFolders(parsed.workingFolders, parsed.cwd),
      agentSessionId: parsed.agentSessionId ?? null,
      usage: readUsage(parsed.usage),
      modelConfig: readModelConfig(parsed.modelConfig),
      cron: parsed.cron === true || undefined,
      autoTitle: parsed.autoTitle === true || undefined,
      resumeAt: Number.isFinite(parsed.resumeAt) ? parsed.resumeAt : undefined,
    };
    // Pin the first resolved root on disk before returning it to startup/hydration.
    if (!Array.isArray(parsed.workingFolders)) await saveSessionMeta(sessionId, meta);
    return meta;
  } catch (err) {
    if (isMissingFile(err)) return null;
    throw err;
  }
}

export async function saveSessionMeta(sessionId: string, meta: SessionMeta): Promise<void> {
  await writeFileAtomic(sessionMetaPath(sessionId), JSON.stringify(meta, null, 2));
}
