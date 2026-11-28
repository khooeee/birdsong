import { homedir } from "node:os";
import { join } from "node:path";
import type { AgentKind } from "../../shared/agentKind";
import { findOnPath } from "./findOnPath";
import { packageBin } from "./packageBin";
import { resolvePathCommand } from "./resolvePathCommand";
import { shellEnv } from "../shellEnv/shellEnv";
import { subagentCapabilityMeta } from "./subagents/subagentCapabilityMeta";

interface AgentPreset {
  kind: AgentKind;
  command: string;
  args: string[];
  authMethodId?: string;
  /** Reads the AIR fork point on `session/fork`, so a fork can drop history after a message. */
  forksAtMessage?: boolean;
  /** External CLI the adapter shells out to; the agent is unavailable without it. */
  requiredCommand?: string;
  /** Extra environment for the adapter process. */
  env?: Record<string, string>;
  /** `clientCapabilities._meta` sent on initialize to opt into adapter-specific behavior. */
  clientCapabilityMeta?: Record<string, unknown>;
  /** Shown instead of the agent's "Authentication required" error. */
  loginHint?: string;
}

function resolveCursorAgent(): string {
  return resolvePathCommand("agent");
}

/** OpenCode's install script puts it in `~/.opencode/bin`; Homebrew and npm put it on PATH. */
function resolveOpencode(): string {
  return resolvePathCommand("opencode", [join(homedir(), ".opencode", "bin", "opencode")]);
}

function claudeCommand(): string {
  return shellEnv.current().CLAUDE_CODE_EXECUTABLE || "claude";
}

function codexCommand(): string {
  return shellEnv.current().CODEX_PATH || "codex";
}

/** The user's own install of an agent CLI; the app does not bundle Claude Code or Codex. */
function userCli(command: string): string {
  return findOnPath(command, shellEnv.current().PATH ?? "") ?? command;
}

export const AGENT_PRESETS: Record<AgentKind, AgentPreset> = {
  claude: {
    kind: "claude",
    command: "node",
    get args() {
      return [packageBin("@agentclientprotocol/claude-agent-acp")];
    },
    forksAtMessage: true,
    clientCapabilityMeta: subagentCapabilityMeta("asyncTasks", "loadReplayEnd"),
    get requiredCommand() {
      return claudeCommand();
    },
    get env() {
      return { CLAUDE_CODE_EXECUTABLE: userCli(claudeCommand()) };
    },
  },
  codex: {
    kind: "codex",
    command: "node",
    get args() {
      return [packageBin("@agentclientprotocol/codex-acp")];
    },
    forksAtMessage: true,
    clientCapabilityMeta: subagentCapabilityMeta(),
    get requiredCommand() {
      return codexCommand();
    },
    get env() {
      return { CODEX_PATH: userCli(codexCommand()) };
    },
  },
  copilot: {
    kind: "copilot",
    get command() {
      return resolvePathCommand("copilot");
    },
    args: ["--acp", "--allow-all"],
    loginHint: "Copilot is not signed in. Run `copilot login` in a terminal, then try again.",
  },
  cursor: {
    kind: "cursor",
    get command() {
      return resolveCursorAgent();
    },
    args: ["acp"],
    authMethodId: "cursor_login",
    // Model and effort as separate config options instead of combined model variants.
    clientCapabilityMeta: { parameterizedModelPicker: true },
  },
  antigravity: {
    kind: "antigravity",
    get command() {
      return resolvePathCommand("agy");
    },
    // Each session in its own worker: agy only connects HTTP MCP servers (Birdsong's own) that way.
    args: ["acp", "--dangerously-skip-permissions", "--process-per-session"],
    loginHint: "Antigravity is not signed in. Run `agy acp --login` in a terminal, then try again.",
  },
  devin: {
    kind: "devin",
    get command() {
      return resolvePathCommand("devin");
    },
    args: ["acp"],
    loginHint: "Devin is not signed in. Run `devin auth login` in a terminal, then try again.",
  },
  kilo: {
    kind: "kilo",
    get command() {
      return resolvePathCommand("kilo");
    },
    args: ["acp"],
    loginHint: "Kilo is not signed in. Run `kilo auth login` in a terminal, then try again.",
  },
  vibe: {
    kind: "vibe",
    get command() {
      return resolvePathCommand("vibe-acp");
    },
    args: [],
    loginHint: "Mistral Vibe is not signed in. Run `vibe` in a terminal to sign in, or set `MISTRAL_API_KEY`, then try again.",
  },
  opencode: {
    kind: "opencode",
    get command() {
      return resolveOpencode();
    },
    args: ["acp"],
    loginHint: "OpenCode is not signed in. Run `opencode auth login` in a terminal, then try again.",
  },
  pi: {
    kind: "pi",
    command: "node",
    get args() {
      return [packageBin("pi-acp")];
    },
    get requiredCommand() {
      return shellEnv.current().PI_ACP_PI_COMMAND || "pi";
    },
  },
};
