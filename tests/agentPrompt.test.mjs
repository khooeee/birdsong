import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { PromptRunner } = await jiti.import("../src/main/acp/PromptRunner.ts");
const { TurnBuilder } = await jiti.import("../src/main/acp/TurnBuilder.ts");
const { handleMcpRequest } = await jiti.import("../src/main/mcp/handleMcpRequest.ts");
const { mcpSessionKeys } = await jiti.import("../src/main/mcp/mcpSessionKeys.ts");

const endTurn = { stopReason: "end_turn" };
const isSteering = (method) => method === "_session/steering";

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

async function waitFor(predicate) {
  const deadline = Date.now() + 2000;
  while (!predicate() && Date.now() < deadline) await delay(5);
  assert.ok(predicate(), "Delivery did not finish");
}

function fixture(t, { available = true, respond, commands = ["compact", "/model", "mcp:server:command"] } = {}) {
  const requests = [];
  const turns = new TurnBuilder(() => {});
  let sessionId = "original";
  const connection = {
    agent: {
      request: async (method, params) => {
        requests.push({ method, params: structuredClone(params) });
        if (respond) return respond(method, params, requests.length);
        return isSteering(method) ? { outcome: "injected" } : endTurn;
      },
    },
  };
  const callbacks = { onStatus() {}, onPromptComplete() {}, onSteeringSupport() {} };
  const runner = new PromptRunner({
    turns, output: { reset() {} }, questions: { cancel() {} },
    callbacks: () => callbacks, connection: () => connection,
    sessionId: () => sessionId, hasBirdsongTools: () => available,
    slashCommands: () => commands.map((name) => ({ name, description: name })),
    isDisposed: () => false, showUpdates() {}, finishPending() {}, noteSystem() {},
    renewSession: async () => { sessionId = "renewed"; },
    worksUnprompted: false,
  });
  t.after(() => runner.dispose());
  return { runner, requests, turns };
}

function assertContext(request, original) {
  const { prompt } = request.params;
  assert.equal(prompt.length, 2);
  assert.deepEqual(prompt[0], { type: "text", text: original });
  assert.match(prompt[1].text, /^<birdsong_context>/);
  assert.match(prompt[1].text, /add_working_folder/);
  assert.match(prompt[1].text, /remove_working_folder/);
  assert.match(prompt[1].text, /Discover these tools on the birdsong MCP server/);
  assert.match(prompt[1].text, /before editing/);
  assert.equal(prompt.filter((block) => block.text?.includes("<birdsong_context>")).length, 1);
}

test("MCP initialize exposes all folder guidance inside the observed summary preview", async (t) => {
  const id = "summary-test";
  const server = createServer((req, res) => {
    void handleMcpRequest(req, res, id, {}).catch((error) => {
      res.writeHead(500).end(String(error));
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/mcp/${id}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${mcpSessionKeys.keyFor(id)}`, "Content-Type": "application/json", Connection: "close" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
  });
  assert.equal(response.status, 200);
  const { result } = await response.json();
  assert.ok(result.instructions.length <= 247, `Summary is ${result.instructions.length} characters`);
  for (const name of ["add_working_folder", "remove_working_folder", "list_working_folders"]) {
    assert.ok(result.instructions.includes(name), `Missing ${name} in namespace preview`);
  }
});

test("every regular prompt carries app context while transcript prompts stay verbatim", async (t) => {
  const { runner, requests, turns } = fixture(t);
  const prompts = ["Create a worktree and fix this bug.\nKeep my formatting.", "Now use a second worktree."];
  for (const prompt of prompts) await runner.prompt(prompt);
  assert.equal(requests.length, 2);
  requests.forEach((request, i) => assertContext(request, prompts[i]));
  assert.deepEqual(turns.list().map((turn) => turn.user.text), prompts);
  assert.ok(turns.list().every((turn) => turn.status === "complete"));
});

test("slash commands keep their single original content block", async (t) => {
  const { runner, requests, turns } = fixture(t);
  for (const command of ["/compact", "/model example", "  /mcp:server:command args"]) {
    await runner.prompt(command);
    assert.deepEqual(requests.at(-1).params.prompt, [{ type: "text", text: command }]);
    assert.equal(turns.list().at(-1).user.text, command);
  }
});

test("slash-prefixed paths and unadvertised drafts still receive worktree context", async (t) => {
  const { runner, requests } = fixture(t);
  for (const prompt of ["/tmp/project", "/tmp/project use a worktree", "/unknown fix this", "/compact-more"]) {
    await runner.prompt(prompt);
    assertContext(requests.at(-1), prompt);
  }
});

test("sessions without Birdsong MCP tools receive only the user's original prompt", async (t) => {
  const { runner, requests } = fixture(t, { available: false });
  await runner.prompt("Create a worktree");
  assert.deepEqual(requests[0].params.prompt, [{ type: "text", text: "Create a worktree" }]);
});

test("injected steering carries the reminder without adding it to transcript events", async (t) => {
  const active = deferred();
  const { runner, requests, turns } = fixture(t, {
    respond: (method) => isSteering(method) ? { outcome: "injected" } : active.promise,
  });
  runner.configureDelivery({ steering: { supported: true } });
  const first = runner.prompt("Start work");
  await waitFor(() => requests.length === 1);
  await runner.prompt("Also create a second worktree");
  assert.equal(requests[1].method, "_session/steering");
  assertContext(requests[1], "Also create a second worktree");
  const [turn] = turns.list();
  assert.equal(turn.user.text, "Start work");
  assert.deepEqual(turn.events.filter((item) => item.role === "user").map((item) => item.text), ["Also create a second worktree"]);
  active.resolve(endTurn);
  await first;
});

test("steering fallback queues the raw prompt and adds context only once on delivery", async (t) => {
  const active = deferred();
  let promptRequests = 0;
  const { runner, requests, turns } = fixture(t, {
    respond: (method) => {
      if (isSteering(method)) return { outcome: "promptRequired" };
      return ++promptRequests === 1 ? active.promise : endTurn;
    },
  });
  runner.configureDelivery({ steering: { supported: true } });
  const first = runner.prompt("Start work");
  await waitFor(() => requests.length === 1);
  await runner.prompt("Then create a worktree", { wait: false });
  assert.equal(requests.length, 2);
  assertContext(requests[1], "Then create a worktree");
  assert.equal(turns.list()[1].user.queued, true);
  active.resolve(endTurn);
  await first;
  await waitFor(() => turns.list().every((turn) => turn.status === "complete"));
  assert.equal(requests.length, 3);
  assertContext(requests[2], "Then create a worktree");
  assert.equal(turns.list()[1].user.text, "Then create a worktree");
});

test("renewing a stale agent session retries with the reminder and original user text", async (t) => {
  const { runner, requests, turns } = fixture(t, {
    respond: (_method, _params, count) => {
      if (count === 1) throw new Error("Session not found");
      return endTurn;
    },
  });
  await runner.prompt("Create a worktree");
  assert.deepEqual(requests.map((request) => request.params.sessionId), ["original", "renewed"]);
  requests.forEach((request) => assertContext(request, "Create a worktree"));
  assert.equal(turns.list().length, 1);
  assert.equal(turns.list()[0].user.text, "Create a worktree");
});
