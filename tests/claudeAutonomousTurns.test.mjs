import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, {
  alias: { electron: fileURLToPath(new URL("./fixtures/electron.cjs", import.meta.url)) },
});
const { AcpSession } = await jiti.import("../src/main/acp/session.ts");
const { AGENT_PRESETS } = await jiti.import("../src/main/acp/presets.ts");
const { liveControlEndpoint } = await jiti.import("../src/main/control/liveControlEndpoint.ts");
const { warmCallbacks } = await jiti.import("../src/main/sessions/warmCallbacks.ts");
const { saveTranscript, loadTranscript } = await jiti.import("../src/main/storage/sessionTranscripts.ts");
const { toRemoteTurn } = await jiti.import("../src/main/remote/toRemoteTurn.ts");

const agentFixture = fileURLToPath(new URL("./fixtures/fakeClaudeAcp.mjs", import.meta.url));
const saved = {
  id: "saved", at: 1, status: "complete", events: [], fileChanges: [],
  user: { id: "prompt", role: "user", text: "Run in background", at: 1 },
  assistant: { id: "reply", role: "assistant", text: "Started", at: 2 },
};

async function waitFor(assertion) {
  const deadline = Date.now() + 2000;
  for (;;) {
    try {
      assertion();
      return;
    } catch (error) {
      if (Date.now() >= deadline) throw error;
    }
    await delay(20);
  }
}

async function attach(t) {
  const original = AGENT_PRESETS.claude;
  AGENT_PRESETS.claude = {
    kind: "claude", command: process.execPath, args: [agentFixture],
    clientCapabilityMeta: original.clientCapabilityMeta,
  };
  t.after(() => { AGENT_PRESETS.claude = original; });
  liveControlEndpoint.set(null);
  const turns = new Map([[saved.id, saved]]);
  const statuses = [];
  let completions = 0;
  const session = new AcpSession("session", "claude", process.cwd(), {
    ...warmCallbacks,
    onStatus: (...status) => statuses.push(status),
    onTurn: (turn) => turns.set(turn.id, turn),
    onTurnRemoved: (id) => turns.delete(id),
    onPromptComplete: () => completions++,
  });
  t.after(() => session.dispose());
  session.restoreTurns([saved]);
  await session.attachExisting("agent-session");
  await waitFor(() => assert.equal(turns.get("autonomous-turn-live")?.assistant?.text, "Background "));
  const update = (...updates) => session.connection.agent.request("_test/update", { updates });
  return { session, turns, statuses, update, completions: () => completions };
}

test("Claude starts a separate live turn after replay and queues a prompt until it ends", async (t) => {
  const { session, turns, statuses, update, completions } = await attach(t);
  const id = "autonomous-turn-live";
  assert.equal(turns.size, 2);
  assert.equal(turns.get(saved.id), saved);
  assert.equal(turns.get(id).user, null);
  assert.equal(turns.get(id).assistant.text, "Background ");
  assert.deepEqual(statuses.at(-1), ["running"]);

  const followUp = await session.prompt("Follow up", { wait: false });
  assert.equal(turns.get(followUp).user.queued, true);
  await update(
    { sessionUpdate: "async_task_spawned", taskType: "shell", asyncTaskId: "background-shell" },
    { sessionUpdate: "async_task_state_update", asyncTaskId: "background-shell", state: "completed" },
    { sessionUpdate: "agent_message_chunk", messageId: "live", content: { type: "text", text: "finished" } },
  );
  await waitFor(() => assert.equal(turns.get(id).assistant.text, "Background finished"));
  assert.equal(turns.get(id).status, "running");
  assert.equal(turns.get(followUp).user.queued, true);

  await update({ sessionUpdate: "async_task_state_update", asyncTaskId: id, state: "completed" });
  await waitFor(() => assert.equal(turns.get(followUp).status, "complete"));
  assert.equal(turns.get(id).status, "complete");
  assert.equal(turns.get(followUp).assistant.text, "User reply");
  assert.equal(turns.get(followUp).user.queued, undefined);
  assert.equal(turns.get(saved.id), saved);
  assert.deepEqual(statuses.at(-1), ["ready", undefined]);
  assert.equal(completions(), 2);
  assert.equal(toRemoteTurn(turns.get(id)).agentStarted, true);
  assert.equal(toRemoteTurn(saved).agentStarted, undefined);

  const dataDir = await mkdtemp(join(tmpdir(), "birdsong-claude-turns-"));
  process.env.BIRDSONG_TEST_USER_DATA = dataDir;
  t.after(async () => {
    delete process.env.BIRDSONG_TEST_USER_DATA;
    await rm(dataDir, { recursive: true, force: true });
  });
  const transcript = [...turns.values()];
  await saveTranscript("session", transcript);
  assert.deepEqual(await loadTranscript("session"), transcript);
});

test("Claude's stop, failure and disconnect settle their own turns", async (t) => {
  const { session, turns, statuses, update, completions } = await attach(t);
  const queued = await session.prompt("Never sent", { wait: false });
  await session.cancel();
  assert.equal(turns.has(queued), false);
  assert.equal(turns.get("autonomous-turn-live").status, "stopped");
  assert.equal(turns.get("autonomous-turn-live").events.at(-1).role, "stopped");
  assert.deepEqual(statuses.at(-1), ["ready", undefined]);

  const failed = "autonomous-turn-failed";
  await update(
    { sessionUpdate: "async_task_spawned", taskType: "turn", asyncTaskId: failed },
    { sessionUpdate: "async_task_state_update", asyncTaskId: failed, state: "failed", summary: "Failed to resume" },
  );
  await waitFor(() => assert.equal(turns.get(failed)?.status, "complete"));
  assert.equal(turns.get(failed).events.at(-1).text, "Failed to resume");
  assert.deepEqual(statuses.at(-1), ["error", "Failed to resume"]);
  assert.equal(completions(), 0);

  const disconnected = "autonomous-turn-disconnected";
  await update({ sessionUpdate: "async_task_spawned", taskType: "turn", asyncTaskId: disconnected });
  await waitFor(() => assert.equal(turns.get(disconnected)?.status, "running"));
  session.connection.close();
  await waitFor(() => assert.equal(turns.get(disconnected).status, "stopped"));
  assert.equal(statuses.at(-1)[0], "error");
});

test("a delayed prompt response only completes the turn that sent it", async (t) => {
  const { session, turns, statuses, update } = await attach(t);
  const liveId = "autonomous-turn-live";
  await update({ sessionUpdate: "async_task_state_update", asyncTaskId: liveId, state: "completed" });
  await waitFor(() => assert.equal(turns.get(liveId).status, "complete"));

  const promptId = await session.prompt("Hold response", { wait: false });
  const overlapId = "autonomous-turn-overlap";
  await waitFor(() => assert.equal(turns.get(overlapId)?.assistant?.text, "More work"));

  await session.connection.agent.request("_test/release_prompt", {});
  await waitFor(() => assert.equal(turns.get(promptId).status, "complete"));
  assert.equal(turns.get(promptId).assistant.text, "User reply");
  assert.equal(turns.get(overlapId).status, "running");
  assert.deepEqual(statuses.at(-1), ["running"]);

  await update({ sessionUpdate: "async_task_state_update", asyncTaskId: overlapId, state: "completed" });
  await waitFor(() => assert.equal(turns.get(overlapId).status, "complete"));
  assert.deepEqual(statuses.at(-1), ["ready", undefined]);
});
