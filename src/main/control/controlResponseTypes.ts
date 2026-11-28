import { AGENT_KINDS } from "../../shared/agentKind";
import type { AgentUsage } from "../../shared/agentUsage";
import type { UsageAgent } from "../../shared/usageAgent";
import type { UsageMeter } from "../../shared/usageMeter";
import type { UsagePage } from "../../shared/usagePage";
import type { FileChange } from "../../shared/fileChange";
import type { Session } from "../../shared/session";
import type { SessionConfigPickers } from "../../shared/sessionConfigPickers";
import type { TranscriptItem, TranscriptTurn } from "../../shared/transcript";

/**
 * Named response shapes referenced by route `response` fields in GET /.
 * `satisfies` keeps each field list in step with the shared types.
 */
export const controlResponseTypes = {
  Error: {
    error: "string — message (400 invalid input, 401 missing/wrong token, 404 unknown route, session or usage agent)",
  },
  Session: {
    id: "string — Birdsong session id used in /sessions/:id routes",
    title: "string",
    agent: AGENT_KINDS.join(" | "),
    cwd: "string — absolute Session Folder path",
    workingFolders: "{ id, path }[] — ordered working folder roots; paths resolve symlinks",
    agentSessionId: "string | null — ACP agent session id (not the Birdsong id)",
    status: "idle | connecting | ready | running | error",
    error: "string | null — set when status is error",
    createdAt: "number — epoch ms",
    supportsSteering: "optional boolean",
    supportsFork: "optional boolean",
    supportsForkAtMessage: "optional boolean",
    slashCommands: "optional { name, description, hint? }[]",
    usage: "optional { used, size, cost?: { amount, currency } } — context window tokens",
    modelConfig: "optional { model?, effort?, modelValue?, effortValue? } — the agent's current model and reasoning effort: display names and choice values",
    cron: "optional boolean — started by a cron run",
    autoTitle: "optional boolean — title follows the agent's generated title until renamed",
    resumeAt: "optional number — epoch ms when a turn stopped by its usage limit continues by itself; a prompt or cancel clears it",
    unread: "optional boolean — a turn finished while the session was off screen",
    home: "optional boolean — the Home session: first in the rail, and it can't be closed or unpinned",
  } satisfies Record<keyof Session, string>,
  ConfigPickers: {
    options: "ConfigOption[] — selects in category model, thought_level (effort) or model_config (per-model setting)",
    modelConfig: "{ model?, effort?, modelValue?, effortValue? } | null — current model and effort",
  } satisfies Record<keyof SessionConfigPickers, string>,
  ConfigOption: {
    id: "string — configId for POST /sessions/:id/config",
    name: "string",
    description: "optional string | null",
    category: "model | thought_level | model_config",
    type: "select",
    currentValue: "string — value of the selected choice",
    options: "{ value, name, description? }[] or { group, name, options: { value, name, description? }[] }[]",
  },
  TranscriptTurn: {
    id: "string — the turnId returned by POST /sessions/:id/prompt",
    at: "number — epoch ms of the user message",
    status: "running | complete | stopped",
    user: "TranscriptItem — the prompt",
    assistant: "TranscriptItem | null — latest assistant reply (read .text)",
    events: "TranscriptItem[] — thoughts, tool calls, earlier assistant messages",
    fileChanges: "FileChange[] — aggregated from tool events",
  } satisfies Record<keyof TranscriptTurn, string>,
  TranscriptItem: {
    id: "string",
    role: "user | assistant | thought | tool | system | stopped | subagent",
    text: "string",
    at: "number — epoch ms",
    queued: "optional boolean — waiting behind an in-flight prompt",
    toolCallId: "optional string",
    toolStatus: "optional string",
    toolTitle: "optional string",
    fileChanges: "optional FileChange[]",
    images: "optional string[] — saved image file names (tool rows)",
    subagentId: "optional string — subagent rows",
  } satisfies Record<keyof TranscriptItem, string>,
  UsageAgent: {
    agent: AGENT_KINDS.join(" | ") + " — for GET /usage/:agent",
    name: "string — display name",
  } satisfies Record<keyof UsageAgent, string>,
  AgentUsage: {
    agent: AGENT_KINDS.join(" | "),
    name: "string — display name",
    plan: "optional string — e.g. Max, Plus",
    meters: "UsageMeter[] — limits, empty for agents that report none",
    notes: "string[] — usage that is not a limit, or where the limits live",
    page: "optional UsagePage — set instead of meters when the agent shows usage only on its website",
    error: "optional string — why the read failed",
  } satisfies Record<keyof AgentUsage, string>,
  UsageMeter: {
    label: "string — e.g. Session, Weekly",
    usedPercent: "number | null — 0–100, null when the agent reports no percentage",
    resetsAt: "number | null — epoch ms of the next reset",
    detail: "optional string — e.g. $4.20 left",
  } satisfies Record<keyof UsageMeter, string>,
  UsagePage: {
    url: "string — the agent's usage page",
    hint: "optional string — how to reach the numbers on that page",
  } satisfies Record<keyof UsagePage, string>,
  FileChange: {
    path: "string",
    kind: "created | updated | deleted | moved",
    oldText: "optional string | null",
    newText: "optional string | null",
    fromPath: "optional string — previous path of a moved file",
  } satisfies Record<keyof FileChange, string>,
};
