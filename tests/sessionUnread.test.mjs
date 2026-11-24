import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, {
  alias: { electron: fileURLToPath(new URL("./fixtures/electron.cjs", import.meta.url)) },
});
const { SessionState } = await jiti.import("../src/main/sessions/SessionState.ts");
const { SessionAgents } = await jiti.import("../src/main/sessions/SessionAgents.ts");
const { setActiveTab } = await jiti.import("../src/main/sessions/setActiveTab.ts");
const { setSessionUnread } = await jiti.import("../src/main/sessions/setSessionUnread.ts");
const { handleControlRequest } = await jiti.import("../src/main/control/controlRoutes.ts");

function fixture() {
  const state = new SessionState();
  for (const id of ["shown", "other"]) {
    state.prependSession({ id, title: id, agent: "claude", cwd: "/repo", workingFolders: [], status: "ready" });
  }
  state.setActiveTabId("shown");
  const lists = [];
  state.listeners.add((channel, payload) => {
    if (channel === "sessions:changed") lists.push(payload);
  });
  const persistence = { persist: async () => {}, queuePersist() {} };
  const agents = new SessionAgents(state, persistence, {}, {});
  const finish = (id) => agents.callbacksFor(state.sessions.get(id)).onPromptComplete();
  const unreadIds = () => {
    const { pinned, unpinned } = state.sessionListPayload();
    return [...pinned, ...unpinned].filter((session) => session.unread).map((session) => session.id);
  };
  return { state, persistence, lists, finish, unreadIds };
}

async function post(state, path) {
  const sessions = {
    getSession: (id) => state.sessions.get(id),
    setSessionUnread: (id, unread) => setSessionUnread(state, id, unread),
  };
  const res = { writeHead(status) { this.status = status; }, end() {} };
  await handleControlRequest({ method: "POST", url: path }, res, true, "http://127.0.0.1/", sessions);
  return res.status;
}

test("a turn that finishes off screen marks its session unread and tells every client once", () => {
  const { lists, finish, unreadIds } = fixture();
  finish("other");
  assert.deepEqual(unreadIds(), ["other"]);
  assert.equal(lists.length, 1);
  finish("other");
  assert.equal(lists.length, 1);
});

test("a turn that finishes in the main panel stays read", () => {
  const { finish, unreadIds } = fixture();
  finish("shown");
  assert.deepEqual(unreadIds(), []);
});

test("opening a session on the Mac reads it", async () => {
  const { state, persistence, finish, unreadIds } = fixture();
  finish("other");
  const deps = { state, persistence, hydration: { ensure: async () => ({}) }, agents: { refreshCommandsIfNeeded() {} } };
  await setActiveTab(deps, "other");
  assert.deepEqual(unreadIds(), []);
});

test("reading a session on the phone clears the Mac's dot", async () => {
  const { state, lists, finish, unreadIds } = fixture();
  finish("other");
  assert.equal(await post(state, "/sessions/other/read"), 200);
  assert.deepEqual(unreadIds(), []);
  assert.equal(lists.length, 2);
  assert.equal(await post(state, "/sessions/missing/read"), 404);
});

test("the shown session can be marked unread and keeps its dot until it is opened again", async () => {
  const { state, unreadIds } = fixture();
  setSessionUnread(state, "shown", true);
  assert.deepEqual(unreadIds(), ["shown"]);
  state.setActiveTabId("other");
  assert.deepEqual(unreadIds(), ["shown"]);
  state.setActiveTabId("shown");
  assert.deepEqual(unreadIds(), []);
});
