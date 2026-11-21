import assert from "node:assert/strict";
import { createInterface } from "node:readline";

const sessionId = "agent-session";
let taskId;
let heldPrompt;

function send(message) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", ...message }) + "\n");
}

function update(update) {
  if (update.sessionUpdate === "async_task_spawned" && update.taskType === "turn") taskId = update.asyncTaskId;
  if (update.sessionUpdate === "async_task_state_update" && update.asyncTaskId === taskId) taskId = undefined;
  send({ method: "session/update", params: { sessionId, update } });
}

function reply(text, messageId) {
  update({ sessionUpdate: "agent_message_chunk", messageId, content: { type: "text", text } });
}

for await (const line of createInterface({ input: process.stdin })) {
  const { id, method, params } = JSON.parse(line);
  let result = {};
  switch (method) {
    case "initialize": {
      const capabilities = params.clientCapabilities._meta.jetbrains.air.capabilities;
      assert.ok(capabilities.includes("asyncTasks"));
      assert.ok(capabilities.includes("loadReplayEnd"));
      assert.ok(capabilities.includes("nativeSubagentSessions"));
      result = {
        protocolVersion: 1,
        agentCapabilities: { loadSession: true },
        _meta: { steering: { supported: true } },
      };
      break;
    }
    case "session/load":
      update({ sessionUpdate: "async_task_spawned", taskType: "turn", asyncTaskId: "autonomous-turn-replay" });
      reply("Old output", "replay");
      update({
        sessionUpdate: "session_info_update",
        _meta: { jetbrains: { air: { version: 1, loadReplayEnd: true } } },
      });
      update({ sessionUpdate: "async_task_spawned", taskType: "turn", asyncTaskId: "autonomous-turn-live" });
      reply("Background ", "live");
      break;
    case "_session/steering":
      assert.equal(params._meta.steering.idleBehavior, "promptRequired");
      result = { outcome: "promptRequired" };
      break;
    case "session/prompt":
      assert.equal(taskId, undefined, "The prompt must wait for the autonomous turn");
      reply("User reply", "prompt-reply");
      if (params.prompt[0].text === "Hold response") {
        heldPrompt = id;
        update({ sessionUpdate: "async_task_spawned", taskType: "turn", asyncTaskId: "autonomous-turn-overlap" });
        reply("More work", "overlap");
        continue;
      }
      result = { stopReason: "end_turn" };
      break;
    case "_session/async_task/stop":
      assert.equal(params.asyncTaskId, taskId);
      update({ sessionUpdate: "async_task_state_update", asyncTaskId: taskId, state: "stopped" });
      result = { stopped: true };
      break;
    case "_test/release_prompt":
      send({ id: heldPrompt, result: { stopReason: "end_turn" } });
      break;
    case "_test/update":
      for (const item of params.updates) update(item);
      break;
    default:
      throw new Error(`Unexpected method ${method}`);
  }
  send({ id, result });
}
