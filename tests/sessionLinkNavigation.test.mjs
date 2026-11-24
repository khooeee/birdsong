import assert from "node:assert/strict";
import { test } from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { navigateToSession } = await jiti.import("../src/main/sessions/navigateToSession.ts");
const { navigateToEvent } = await jiti.import("../src/main/sessions/navigateToEvent.ts");

function fixture({ open = true, found = true } = {}) {
  const calls = [];
  const state = {
    sessions: new Map(open ? [["target", {}]] : []),
    activeTabId: "previous",
    setActiveTabId: (id) => { state.activeTabId = id; },
    emitSessions: () => calls.push(["sessions", state.activeTabId]),
    pushTranscript: (id) => calls.push(["transcript", id]),
    send: (channel, payload) => calls.push([channel, payload]),
  };
  const deps = {
    state,
    hydration: {
      reopen: async (id) => { calls.push(["reopen", id]); return found ? {} : null; },
      ensure: async (id) => { calls.push(["ensure", id]); return found ? {} : null; },
      forgetMissing: (id) => calls.push(["missing", id]),
    },
    persistence: { persist: async () => calls.push(["persist"]) },
    agents: { refreshCommandsIfNeeded: (id) => calls.push(["commands", id]) },
  };
  return { calls, deps };
}

for (const open of [true, false]) {
  test(`links ${open ? "hydrate open" : "reopen closed"} sessions before requesting bottom scroll`, async () => {
    const { calls, deps } = fixture({ open });
    await navigateToSession(deps, "target");
    assert.deepEqual(calls, [
      [open ? "ensure" : "reopen", "target"], ["sessions", "target"], ["transcript", "target"],
      ["persist"], ["commands", "target"], ["navigate-session", { sessionId: "target" }],
    ]);
    // Following the same link again still requests a fresh scroll.
    await navigateToSession(deps, "target");
    assert.equal(calls.filter(([channel]) => channel === "navigate-session").length, 2);
  });
}

test("missing sessions report their absence without selecting or scrolling", async () => {
  const { calls, deps } = fixture({ open: false, found: false });
  await navigateToSession(deps, "target");
  assert.equal(deps.state.activeTabId, "previous");
  assert.deepEqual(calls, [["reopen", "target"], ["missing", "target"]]);
});

test("existing event navigation still reopens and targets the requested event", async () => {
  const { calls, deps } = fixture({ open: false });
  await navigateToEvent(deps, "target", "turn", "event");
  assert.deepEqual(calls.at(-1), ["navigate-event", { sessionId: "target", turnId: "turn", eventId: "event" }]);
  assert.ok(!calls.some(([channel]) => channel === "navigate-session"));
});
