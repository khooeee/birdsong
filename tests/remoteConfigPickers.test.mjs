import assert from "node:assert/strict";
import { test } from "node:test";
import * as acp from "@agentclientprotocol/sdk/unstable";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { SessionConfigOptions } = await jiti.import("../src/main/acp/SessionConfigOptions.ts");
const { getSessionConfigPickers } = await jiti.import("../src/main/sessions/getSessionConfigPickers.ts");
const { setSessionConfigOption } = await jiti.import("../src/main/sessions/setSessionConfigOption.ts");

function options(model = "old", effort = "low") {
  return [
    { id: "mode", name: "Mode", category: "mode", type: "select", currentValue: "default",
      options: [{ value: "default", name: "Default" }] },
    { id: "model", name: "Model", category: "model", type: "select", currentValue: model,
      options: [{ group: "models", name: "Models", options: [
        { value: "old", name: "Previous model" }, { value: "new", name: "Chosen model" },
      ] }] },
    { id: "effort", name: "Effort", category: "thought_level", type: "select", currentValue: effort,
      options: [{ value: "low", name: "Low" }, ...(model === "new" ? [{ value: "high", name: "High" }] : [])] },
    { id: "fast", name: "Fast mode", category: "model_config", type: "boolean", currentValue: false },
  ];
}

function fixture() {
  const calls = [];
  let current = options();
  const config = new SessionConfigOptions({
    connection: () => ({ agent: { request: async (method, params) => {
      assert.equal(method, acp.methods.agent.session.setConfigOption);
      calls.push([params.configId, params.value]);
      const model = params.configId === "model" ? params.value : current[1].currentValue;
      const effort = params.configId === "effort" ? params.value : current[2].currentValue;
      current = options(model, effort);
      return { configOptions: current };
    } } }),
    sessionId: () => "agent-session",
    onModelConfig: () => {},
  });
  config.note(current);
  const session = { id: "s1" };
  const deps = {
    hydration: { ensure: async (id) => (id === session.id ? session : null) },
    agents: { ensureSession: async () => ({ config }) },
  };
  return { deps, calls };
}

test("pickers list model, effort and per-model selects with the current names", async () => {
  const { deps } = fixture();
  const pickers = await getSessionConfigPickers(deps, "s1");
  assert.deepEqual(pickers.options.map((option) => option.id), ["model", "effort"]);
  assert.deepEqual(pickers.modelConfig, {
    model: "Previous model", effort: "Low", modelValue: "old", effortValue: "low",
  });
});

test("picking a model returns the efforts the new model offers", async () => {
  const { deps, calls } = fixture();
  const pickers = await setSessionConfigOption(deps, "s1", "model", "new");
  assert.deepEqual(calls, [["model", "new"]]);
  assert.equal(pickers.modelConfig.model, "Chosen model");
  const effort = pickers.options.find((option) => option.id === "effort");
  assert.deepEqual(effort.options.map((choice) => choice.value), ["low", "high"]);
});

test("unknown options and choices are refused; the current choice sends nothing", async () => {
  const { deps, calls } = fixture();
  await assert.rejects(setSessionConfigOption(deps, "s1", "mode", "default"), /Unknown config option/);
  await assert.rejects(setSessionConfigOption(deps, "s1", "effort", "high"), /no longer available/);
  await setSessionConfigOption(deps, "s1", "effort", "low");
  assert.deepEqual(calls, []);
  await assert.rejects(getSessionConfigPickers(deps, "missing"), /No session/);
});
