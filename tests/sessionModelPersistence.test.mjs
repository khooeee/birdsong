import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import * as acp from "@agentclientprotocol/sdk/unstable";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, {
  alias: { electron: fileURLToPath(new URL("./fixtures/electron.cjs", import.meta.url)) },
});
const { SessionConfigOptions } = await jiti.import("../src/main/acp/SessionConfigOptions.ts");
const { AcpSession } = await jiti.import("../src/main/acp/session.ts");
const { warmCallbacks } = await jiti.import("../src/main/sessions/warmCallbacks.ts");
const { liveControlEndpoint } = await jiti.import("../src/main/control/liveControlEndpoint.ts");
const { loadSessionMeta, saveSessionMeta } = await jiti.import("../src/main/storage/sessionMeta.ts");
const { metaFromSession } = await jiti.import("../src/main/storage/metaFromSession.ts");
const { sessionFromMeta } = await jiti.import("../src/main/storage/sessionFromMeta.ts");
liveControlEndpoint.set(null);

function options(model = "old", effort = "low") {
  return [
    {
      id: "model-picker", name: "Model", category: "model", type: "select", currentValue: model,
      options: [{ group: "models", name: "Models", options: [
        { value: "old", name: "Previous model" }, { value: "new", name: "Chosen model" },
      ] }],
    },
    {
      id: "effort-picker", name: "Effort", category: "thought_level", type: "select", currentValue: effort,
      options: [
        { value: "low", name: "Low" },
        ...(model === "new" ? [{ value: "high", name: "High" }] : []),
      ],
    },
  ];
}

function agentFixture(t, saved) {
  const calls = [];
  const reports = [];
  let current = options();
  const session = new AcpSession("model-test", "codex", "/repo", {
    ...warmCallbacks,
    onModelConfig: (config) => reports.push(config),
    onStatus: (status) => {
      if (status === "ready") calls.push("ready");
    },
  }, saved);
  session.connectAgent = async () => {};
  session.connection = {
    close() {},
    agent: { request: async (method, params) => {
      if (method === acp.methods.agent.session.setConfigOption) {
        calls.push([params.configId, params.value]);
        current = params.configId === "model-picker"
          ? options(params.value)
          : options(current[0].currentValue, params.value);
        return { configOptions: current };
      }
      calls.push(method);
      current = options();
      return { sessionId: "agent-model-test", configOptions: current };
    } },
  };
  t.after(() => session.dispose());
  return { session, calls, reports };
}

test("a model change survives metadata save/load and is applied before a resumed session is ready", async (t) => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "birdsong-model-"));
  const previous = process.env.BIRDSONG_TEST_USER_DATA;
  process.env.BIRDSONG_TEST_USER_DATA = temporary;
  t.after(async () => {
    if (previous === undefined) delete process.env.BIRDSONG_TEST_USER_DATA;
    else process.env.BIRDSONG_TEST_USER_DATA = previous;
    await fs.rm(temporary, { recursive: true, force: true });
  });
  const before = agentFixture(t);
  await before.session.start();
  await before.session.config.set("model-picker", "new");
  await before.session.config.set("effort-picker", "high");
  const record = {
    id: "saved", title: "Saved", agent: "codex", cwd: temporary,
    workingFolders: [{ id: "session", path: temporary }], agentSessionId: "old-agent-id",
    modelConfig: before.reports.at(-1),
  };
  await saveSessionMeta(record.id, metaFromSession(record));
  const loaded = sessionFromMeta(record.id, await loadSessionMeta(record.id));
  assert.deepEqual(loaded.modelConfig, {
    model: "Chosen model", effort: "High", modelValue: "new", effortValue: "high",
  });
  const after = agentFixture(t, loaded.modelConfig);
  // Restore an actual turn so attach takes the load path rather than creating an empty session.
  after.session.restoreTurns([{
    id: "turn", at: 0, user: { id: "user", role: "user", text: "hello", at: 0 },
    assistant: null, events: [], fileChanges: [], status: "complete",
  }]);
  after.session.canLoad = true;
  await after.session.attachExisting(loaded.agentSessionId);
  assert.deepEqual(after.calls, [
    acp.methods.agent.session.load, ["model-picker", "new"], ["effort-picker", "high"], "ready",
  ]);
  assert.deepEqual(after.reports.at(-1), loaded.modelConfig);
});

test("never-prompted sessions restore their model on the replacement agent session", async (t) => {
  const { session, calls } = agentFixture(t, { modelValue: "new", effortValue: "high" });
  await session.attachExisting("hollow-agent-session");
  assert.deepEqual(calls, [
    acp.methods.agent.session.new, ["model-picker", "new"], ["effort-picker", "high"], "ready",
  ]);
});

test("legacy display names restore grouped model choices and model-specific effort", async (t) => {
  const { session, calls } = agentFixture(t, { model: "Chosen model", effort: "High" });
  await session.start();
  assert.deepEqual(calls.slice(1), [["model-picker", "new"], ["effort-picker", "high"], "ready"]);
});

test("missing choices are skipped and already selected values need no requests", async (t) => {
  const { session, calls } = agentFixture(t, { modelValue: "removed", effortValue: "low" });
  await session.start();
  assert.deepEqual(calls, [acp.methods.agent.session.new, "ready"]);
});

test("value changes are reported even when their display names are identical", () => {
  const reports = [];
  const config = new SessionConfigOptions({ onModelConfig: (value) => reports.push(value) });
  const choices = options();
  choices[0].options[0].options[1].name = "Previous model";
  config.note(choices);
  config.note([{ ...choices[0], currentValue: "new" }, choices[1]]);
  assert.equal(reports.length, 2);
  assert.equal(reports[1].modelValue, "new");
});

test("a second start waits until the first start restores the model", async (t) => {
  const { session } = agentFixture(t, { modelValue: "new" });
  const request = session.connection.agent.request;
  let release;
  const blocked = new Promise((resolve) => { release = resolve; });
  session.connection.agent.request = async (method, params) => {
    if (method === acp.methods.agent.session.setConfigOption) await blocked;
    return request(method, params);
  };
  const first = session.start();
  // Advance to the blocked restore, after the agent session id has been assigned.
  while (!session.sessionId) await new Promise((resolve) => setImmediate(resolve));
  const second = session.start();
  assert.equal(second, first);
  release();
  await Promise.all([first, second]);
  assert.equal(session.config.snapshot().modelValue, "new");
});
