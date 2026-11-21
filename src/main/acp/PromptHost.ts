import type * as acp from "@agentclientprotocol/sdk/unstable";
import type { SlashCommand } from "../../shared/session";
import type { SessionCallbacks } from "./SessionCallbacks";
import type { SessionOutput } from "./SessionOutput";
import type { TurnBuilder } from "./TurnBuilder";
import type { PendingQuestions } from "./PendingQuestions";

/** What PromptRunner needs from its AcpSession. */
export type PromptHost = {
  turns: TurnBuilder;
  output: SessionOutput;
  questions: PendingQuestions;
  callbacks: () => SessionCallbacks;
  connection: () => acp.ClientConnection | null;
  sessionId: () => string | null;
  hasBirdsongTools: () => boolean;
  slashCommands: () => readonly SlashCommand[];
  isDisposed: () => boolean;
  /** Mirror streamed updates to the transcript again (after load/resume replay). */
  showUpdates: () => void;
  /** Drop the stale agent session id and mint a fresh agent session. */
  renewSession: () => Promise<void>;
  finishPending: (status: string) => void;
  noteSystem: (text: string, turnId?: string) => void;
  /** The agent can work with no prompt in flight and report no turn for it (Claude Code on ACP v1). */
  worksUnprompted: boolean;
};
