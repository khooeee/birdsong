import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, {
  alias: { electron: fileURLToPath(new URL("./fixtures/electron.cjs", import.meta.url)) },
});
const { AcpSession } = await jiti.import("../src/main/acp/session.ts");
const { liveControlEndpoint } = await jiti.import("../src/main/control/liveControlEndpoint.ts");
const { buildSessionCallbacks } = await jiti.import("../src/main/sessions/buildSessionCallbacks.ts");
const { warmCallbacks } = await jiti.import("../src/main/sessions/warmCallbacks.ts");
const { sessionRoutes } = await jiti.import("../src/main/acp/sessionRoutes.ts");

// Exercise fork/resume without starting a real agent process or connecting to the user's app.
liveControlEndpoint.set(null);
const inherited = [{ name: "compact", description: "Compact history" }];

async function forkFixture(t, agent, resumedCommands) {
  const parent = new AcpSession(`parent-${agent}`, agent, "/repo", warmCallbacks);
  parent.setSessionId(`parent-agent-${agent}`);
  parent.updates.update(parent.sessionId, { sessionUpdate: "available_commands_update", availableCommands: inherited });
  const childState = { id: `child-${agent}`, title: "Fork", agent, cwd: "/repo", workingFolders: [] };
  const emitted = [];
  const callbacks = buildSessionCallbacks({
    session: childState, send() {}, handleTurn() {}, handleSubagentTurn() {}, removeTurn() {}, setStatus() {},
    emitSessions: () => emitted.push(structuredClone(childState)),
    noteForkSupport() {}, queuePersist() {}, askOwners: new Map(), observer: () => null,
  });
  const childAgentId = `child-agent-${agent}`;
  let resumes = 0;
  parent.connection = {
    close() {},
    agent: {
      request: async (_method, params) => {
        if (params.sessionId === parent.sessionId) return { sessionId: childAgentId };
        assert.equal(params.sessionId, childAgentId);
        resumes++;
        if (resumedCommands) {
          sessionRoutes.forUpdate(childAgentId, parent).updates.update(childAgentId, {
            sessionUpdate: "available_commands_update", availableCommands: resumedCommands,
          });
        }
        return {};
      },
    },
  };
  t.after(() => parent.dispose());
  const child = await parent.forkSibling(childState.id, callbacks);
  t.after(() => child.dispose());
  return { childState, emitted, resumes, child, inheritedCommands: parent.updates.availableCommands };
}

for (const agent of ["codex", "claude", "cursor"]) {
  test(`${agent} forks publish inherited commands even without another announcement`, async (t) => {
    const { childState, emitted, resumes, inheritedCommands } = await forkFixture(t, agent);
    assert.deepEqual(childState.slashCommands, inheritedCommands);
    assert.deepEqual(emitted[0].slashCommands, inheritedCommands);
    assert.notEqual(childState.slashCommands, inheritedCommands);
    assert.equal(resumes, agent === "cursor" ? 0 : 1);
  });
}

test("a resume announcement replaces inherited commands in both the composer state and router", async (t) => {
  const updated = [{ name: "review", description: "Review changes" }];
  const { childState, emitted, child, inheritedCommands } = await forkFixture(t, "codex", updated);
  assert.deepEqual(emitted[0].slashCommands, inheritedCommands);
  assert.deepEqual(emitted.at(-1).slashCommands, child.updates.availableCommands);
  assert.deepEqual(childState.slashCommands, child.updates.availableCommands);
  assert.deepEqual(childState.slashCommands.map((command) => command.name), ["review"]);
});
