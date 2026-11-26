import * as acp from "@agentclientprotocol/sdk/unstable";
import { formatAgentError } from "../../shared/formatAgentError";
import type { PromptHost } from "./PromptHost";
import type { PromptQueue } from "./PromptQueue";
import type { MidTurnPrompts } from "./MidTurnPrompts";
import { PromptDelivery } from "./PromptDelivery";
import { agentPrompt } from "./agentPrompt";

/** A session's delivery: steer the running turn where the agent can, else queue a prompt. */
export function createPromptDelivery(
  host: PromptHost,
  prompts: PromptQueue,
  midTurn: MidTurnPrompts,
  isRunning: () => boolean,
): PromptDelivery {
  const live = () => {
    const connection = host.connection();
    const sessionId = host.sessionId();
    if (!connection || !sessionId || host.isDisposed()) throw new Error("Session closed");
    return { connection, sessionId };
  };
  const content = (text: string) => agentPrompt(text, host.hasBirdsongTools(), host.slashCommands());

  return new PromptDelivery({
    isRunning,
    prompt: (text, id) => prompts.send(text, id),
    steer: (text) => {
      const { connection, sessionId } = live();
      return connection.agent.request("_session/steering", {
        sessionId,
        prompt: content(text),
        _meta: { steering: { idleBehavior: "promptRequired" } },
      });
    },
    injectPrompt: (text) => {
      const turnId = host.turns.activeTurnId() ?? undefined;
      midTurn.send(
        () => {
          const { connection, sessionId } = live();
          return connection.agent.request(acp.methods.agent.session.prompt, { sessionId, prompt: content(text) });
        },
        (error) => {
          if (!host.isDisposed()) host.noteSystem(formatAgentError(error), turnId);
        },
      );
    },
    onSupport: (supported) => host.callbacks().onSteeringSupport(supported),
  });
}
