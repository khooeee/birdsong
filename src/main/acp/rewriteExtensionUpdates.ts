import type * as acp from "@agentclientprotocol/sdk/unstable";
import { SUBAGENT_UPDATE_METHOD } from "./subagents/subagentUpdateMethod";
import { AUTONOMOUS_TURN_UPDATE_METHOD } from "./autonomousTurnUpdateMethod";

function extensionMethod(message: acp.AnyMessage): string | undefined {
  if (!("method" in message) || message.method !== "session/update" || "id" in message) return;
  const params = message.params as { update?: { sessionUpdate?: unknown } } | undefined;
  switch (params?.update?.sessionUpdate) {
    case "subagent_spawned":
    case "subagent_state_update":
      return SUBAGENT_UPDATE_METHOD;
    case "async_task_spawned":
    case "async_task_state_update":
      return AUTONOMOUS_TURN_UPDATE_METHOD;
  }
}

/** Route extension notifications that the SDK's session/update schema would drop. */
export function rewriteExtensionUpdates(stream: acp.Stream): acp.Stream {
  return {
    writable: stream.writable,
    readable: stream.readable.pipeThrough(
      new TransformStream<acp.AnyMessage, acp.AnyMessage>({
        transform(message, controller) {
          const method = extensionMethod(message);
          controller.enqueue(method ? { ...message, method } : message);
        },
      }),
    ),
  };
}
