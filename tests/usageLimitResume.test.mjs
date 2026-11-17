import assert from "node:assert/strict";
import { test } from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { usageLimitResetAt } = await jiti.import("../src/main/acp/usageLimitResetAt.ts");
const { PromptRunner } = await jiti.import("../src/main/acp/PromptRunner.ts");
const { TurnBuilder } = await jiti.import("../src/main/acp/TurnBuilder.ts");
const { UsageLimitResumer } = await jiti.import("../src/main/sessions/UsageLimitResumer.ts");

const RESET_SECONDS = 1_800_000_000;

function limitError(rateLimit) {
  return Object.assign(new Error("Internal error"), { data: { errorKind: "rate_limit", rateLimit } });
}

function claudeLimitError(time = "3:10am", zone = "America/Los_Angeles") {
  return Object.assign(new Error(`Internal error: You've hit your session limit · resets ${time} (${zone})`), {
    data: { errorKind: "rate_limit" },
  });
}

function promptFixture(t, error, onUsageLimit) {
  const runner = new PromptRunner({
    turns: new TurnBuilder(() => {}), output: { reset() {} }, questions: { cancel() {} },
    callbacks: () => ({ onStatus() {}, onPromptComplete() {}, onSteeringSupport() {}, onUsageLimit }),
    connection: () => ({ agent: { request: async () => { throw error; } } }), sessionId: () => "session",
    hasBirdsongTools: () => false, slashCommands: () => [],
    isDisposed: () => false, showUpdates() {}, worksUnprompted: false,
    finishPending() {}, noteSystem() {}, renewSession: async () => {},
  });
  t.after(() => runner.dispose());
  return runner;
}

test("only a rejected usage limit has a reset time", () => {
  assert.equal(usageLimitResetAt(limitError({ status: "rejected", resetsAt: RESET_SECONDS })), RESET_SECONDS * 1000);
  assert.equal(usageLimitResetAt(limitError({ status: "allowed_warning", resetsAt: RESET_SECONDS })), null);
  assert.equal(usageLimitResetAt(limitError({ status: "rejected" })), null);
  assert.equal(usageLimitResetAt(limitError(undefined)), null);
  assert.equal(usageLimitResetAt(new Error("Session not found")), null);
});

test("a prompt stopped by a usage limit reports its reset time", async (t) => {
  const error = limitError({ status: "rejected", resetsAt: RESET_SECONDS });
  const resets = [];
  const runner = promptFixture(t, error, (resetAt) => resets.push(resetAt));

  await assert.rejects(runner.prompt("Work"), (caught) => caught === error);
  assert.deepEqual(resets, [RESET_SECONDS * 1000]);
});

test("Claude's text-only reset uses its named time zone and next local date", () => {
  const cases = [
    ["2026-11-16T06:54:06Z", "3:10am", "America/Los_Angeles", "2026-11-16T11:10:00Z"],
    ["2026-06-16T05:54:06Z", "3:10am", "America/Los_Angeles", "2026-06-16T10:10:00Z"],
    ["2026-11-16T07:00:00Z", "12am", "America/Los_Angeles", "2026-11-16T08:00:00Z"],
    ["2026-12-31T23:50:00Z", "12am", "UTC", "2027-01-01T00:00:00Z"],
    ["2026-11-16T06:00:00Z", "12pm", "Asia/Kathmandu", "2026-11-16T06:15:00Z"],
    ["2026-03-08T09:50:00Z", "3:10am", "America/Los_Angeles", "2026-03-08T10:10:00Z"],
    ["2026-11-01T08:40:00Z", "1:50am", "America/Los_Angeles", "2026-11-01T08:50:00Z"],
    ["2026-11-01T09:40:00Z", "1:50am", "America/Los_Angeles", "2026-11-01T09:50:00Z"],
  ];
  for (const [now, time, zone, expected] of cases) {
    assert.equal(usageLimitResetAt(claudeLimitError(time, zone), Date.parse(now)), Date.parse(expected), `${now}: ${time} (${zone})`);
  }
});

test("a structured reset takes precedence and invalid or unrelated text is ignored", () => {
  const now = Date.parse("2026-11-16T06:54:06Z");
  const error = claudeLimitError();
  error.data.rateLimit = { status: "rejected", resetsAt: RESET_SECONDS };
  assert.equal(usageLimitResetAt(error, now), RESET_SECONDS * 1000);
  const message = "You've hit your session limit · resets 3:10am (America/Los_Angeles)";
  const expected = Date.parse("2026-11-16T11:10:00Z");
  assert.equal(usageLimitResetAt(new Error(message), now), expected);
  assert.equal(usageLimitResetAt(Object.assign(new Error("Internal error"), { data: { details: message } }), now), expected);
  for (const [time, zone] of [["13am", "UTC"], ["0am", "UTC"], ["3:60am", "UTC"], ["3am", "Invalid/Zone"]]) {
    assert.equal(usageLimitResetAt(claudeLimitError(time, zone), now), null);
  }
  assert.equal(usageLimitResetAt(new Error("API rate limit exceeded"), now), null);
  assert.equal(usageLimitResetAt(new Error("An example: You've hit your session limit · resets 3am (UTC)"), now), null);
});

test("sending continue after cancelling a retry rearms it when Claude omits structured reset data", async (t) => {
  const now = Date.parse("2026-11-16T06:54:06Z");
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now });
  const session = { id: "session" };
  const state = { sessions: new Map([[session.id, session]]), emitSessions() {} };
  const prompts = [];
  const resumer = new UsageLimitResumer(state, async (id, text) => { prompts.push({ id, text }); });
  t.after(() => resumer.stop());
  resumer.start();
  resumer.schedule(session, now - 60_000);
  resumer.cancel(session.id);
  const error = claudeLimitError();
  const runner = promptFixture(t, error, (resetAt) => resumer.schedule(session, resetAt));
  await assert.rejects(runner.prompt("continue"), (caught) => caught === error);
  const resumeAt = Date.parse("2026-11-16T11:11:00Z");
  assert.equal(session.resumeAt, resumeAt);
  t.mock.timers.tick(resumeAt - now - 1);
  assert.deepEqual(prompts, []);
  t.mock.timers.tick(1);
  assert.equal(prompts.length, 1);
  assert.equal(prompts[0].id, session.id);
});

test("a stopped session is prompted once, after its limit resets", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 0 });
  const session = { id: "a" };
  const idle = { id: "b" };
  const prompted = [];
  let emits = 0;
  const state = { sessions: new Map([["a", session], ["b", idle]]), emitSessions: () => emits++ };
  const resumer = new UsageLimitResumer(state, async (sessionId) => { prompted.push(sessionId); });
  t.after(() => resumer.stop());
  resumer.start();

  resumer.schedule(session, 3 * 60_000);
  assert.equal(session.resumeAt, 4 * 60_000, "Resumes a minute after the reset");
  assert.equal(emits, 1);

  t.mock.timers.tick(4 * 60_000 - 1);
  assert.deepEqual(prompted, []);
  t.mock.timers.tick(1);
  assert.deepEqual(prompted, ["a"]);
  assert.equal(session.resumeAt, undefined);

  t.mock.timers.tick(10 * 60_000);
  assert.deepEqual(prompted, ["a"], "A resumed session is not prompted again");
});

test("a reset already past and a cancelled resume", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 10 * 60_000 });
  const session = { id: "a" };
  const prompted = [];
  const state = { sessions: new Map([["a", session]]), emitSessions() {} };
  const resumer = new UsageLimitResumer(state, async (sessionId) => { prompted.push(sessionId); });
  t.after(() => resumer.stop());
  resumer.start();

  resumer.schedule(session, 0);
  assert.equal(session.resumeAt, 11 * 60_000, "A refused resume waits before the next try");
  assert.equal(resumer.cancel("a"), true);
  assert.equal(resumer.cancel("a"), false);
  t.mock.timers.tick(60 * 60_000);
  assert.deepEqual(prompted, []);
});

test("a resume that came due while the app was closed runs at start", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 10 * 60_000 });
  const session = { id: "a", resumeAt: 60_000 };
  const prompted = [];
  const state = { sessions: new Map([["a", session]]), emitSessions() {} };
  const resumer = new UsageLimitResumer(state, async (sessionId) => { prompted.push(sessionId); });
  t.after(() => resumer.stop());

  resumer.start();
  assert.deepEqual(prompted, ["a"]);
});
