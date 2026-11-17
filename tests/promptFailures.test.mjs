import assert from "node:assert/strict";
import { test } from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { PromptRunner } = await jiti.import("../src/main/acp/PromptRunner.ts");
const { TurnBuilder } = await jiti.import("../src/main/acp/TurnBuilder.ts");

for (const failure of ["request", "renewal", "retry"]) {
  test(`${failure} failures settle the prompt and report the error once`, async (t) => {
    const error = new Error(`${failure} failed`);
    const statuses = [];
    const notes = [];
    const finished = [];
    const turns = new TurnBuilder(() => {});
    let requests = 0;
    let renewals = 0;
    let completions = 0;
    let failing = true;
    const connection = {
      agent: {
        request: async (method) => {
          assert.notEqual(method, "_session/steering", "Failed prompts must leave the runner idle");
          requests++;
          if (failing) {
            if (failure !== "request" && requests === 1) throw new Error("Session not found");
            throw error;
          }
          return { stopReason: "end_turn" };
        },
      },
    };
    const runner = new PromptRunner({
      turns, output: { reset() {} }, questions: { cancel() {} },
      callbacks: () => ({
        onStatus: (...args) => statuses.push(args),
        onPromptComplete: () => completions++,
        onSteeringSupport() {},
      }),
      connection: () => connection, sessionId: () => "session",
      hasBirdsongTools: () => false, slashCommands: () => [],
      isDisposed: () => false, showUpdates() {}, worksUnprompted: false,
      finishPending: (status) => finished.push(status),
      noteSystem: (text) => notes.push(text),
      renewSession: async () => {
        renewals++;
        if (failure === "renewal") throw error;
      },
    });
    t.after(() => runner.dispose());
    runner.configureDelivery({ steering: { supported: true } });

    await assert.rejects(runner.prompt("First prompt"), (caught) => caught === error);
    assert.deepEqual(notes, [error.message]);
    assert.deepEqual(finished, ["interrupted"]);
    assert.deepEqual(statuses.filter(([status]) => status === "error"), [["error", error.message]]);
    assert.equal(turns.list()[0].status, "complete");
    assert.equal(completions, 0, "Failed prompts must not trigger the completion sound");
    assert.equal(requests, failure === "retry" ? 2 : 1);
    assert.equal(renewals, failure === "request" ? 0 : 1);

    failing = false;
    await runner.prompt("Next prompt");
    assert.ok(turns.list().every((turn) => turn.status === "complete"));
    assert.equal(completions, 1);
  });
}
