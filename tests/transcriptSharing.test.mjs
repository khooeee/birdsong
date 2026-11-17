import assert from "node:assert/strict";
import { test } from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { mergeTurnsById } = await jiti.import("../src/shared/mergeTurnsById.ts");
const { shareById } = await jiti.import("../src/renderer/features/sessions/shareById.ts");
const { shareTurn } = await jiti.import("../src/renderer/features/sessions/shareTurn.ts");
const { upsertTurn } = await jiti.import("../src/renderer/features/sessions/upsertTurn.ts");

function turn(id, text = "Reply") {
  return {
    id, at: 1, status: "running",
    user: { id: `${id}-user`, role: "user", text: "Prompt", at: 1 },
    assistant: { id: `${id}-reply`, role: "assistant", text, at: 2 },
    events: [
      { id: `${id}-thought`, role: "thought", text: "Thinking", at: 1 },
      { id: `${id}-tool`, role: "tool", text: "Output", at: 2, images: ["image.png"] },
    ],
    fileChanges: [{ path: "/repo/file.ts", kind: "updated" }],
  };
}

test("identical IPC snapshots reuse the transcript list and every turn", () => {
  const previous = [turn("one"), turn("two")];
  assert.equal(shareById(previous, structuredClone(previous), shareTurn), previous);
  assert.equal(upsertTurn(previous, structuredClone(previous[1])), previous);
});

test("streaming a reply preserves prior turns and the current turn's unchanged parts", () => {
  const previous = [turn("one"), turn("two")];
  const incoming = structuredClone(previous[1]);
  incoming.assistant.text += " chunk";
  const next = upsertTurn(previous, incoming);
  assert.notEqual(next, previous);
  assert.equal(next[0], previous[0]);
  assert.notEqual(next[1], previous[1]);
  assert.equal(next[1].user, previous[1].user);
  assert.equal(next[1].events, previous[1].events);
  assert.equal(next[1].fileChanges, previous[1].fileChanges);
  assert.equal(next[1].assistant.text, "Reply chunk");
  assert.equal(previous[1].assistant.text, "Reply");
});

test("a tool update replaces only its event while preserving other messages", () => {
  const previous = turn("one");
  const incoming = structuredClone(previous);
  incoming.events[1].images.push("second.png");
  const next = shareTurn(previous, incoming);
  assert.notEqual(next.events, previous.events);
  assert.equal(next.events[0], previous.events[0]);
  assert.notEqual(next.events[1], previous.events[1]);
  assert.equal(next.user, previous.user);
  assert.equal(next.assistant, previous.assistant);
  assert.equal(next.fileChanges, previous.fileChanges);
});

test("turn metadata, removals and file changes remain visible after sharing", () => {
  const previous = turn("one");
  for (const patch of [
    { id: "renamed" }, { at: 3 }, { status: "complete" }, { assistant: null },
    { events: [] }, { fileChanges: [] },
    { user: { ...previous.user, queued: true } },
  ]) {
    const incoming = { ...structuredClone(previous), ...patch };
    const next = shareTurn(previous, incoming);
    assert.notEqual(next, previous);
    assert.deepEqual(next, incoming);
  }
});

test("transcript resets preserve surviving rows while removing and reordering turns", () => {
  const previous = [turn("one"), turn("two"), turn("three")];
  const next = shareById(previous, structuredClone([previous[2], previous[0]]), shareTurn);
  assert.deepEqual(next.map((entry) => entry.id), ["three", "one"]);
  assert.equal(next[0], previous[2]);
  assert.equal(next[1], previous[0]);
});

test("batched merges preserve order, apply the last update and leave inputs unchanged", () => {
  const base = [turn("one"), turn("two")];
  const update = turn("one", "Updated");
  const appended = turn("three", "Final");
  const updates = [turn("three"), update, appended];
  const next = mergeTurnsById(base, updates);
  assert.deepEqual(next.map((entry) => entry.id), ["one", "two", "three"]);
  assert.equal(next[0], update);
  assert.equal(next[1], base[1]);
  assert.equal(next[2], appended);
  assert.equal(base.length, 2);
  assert.equal(base[0].assistant.text, "Reply");
  assert.equal(updates.length, 3);
  assert.equal(mergeTurnsById(base, []), base);
  assert.equal(mergeTurnsById(base, [...base]), base);
});

test("saved subagent history merges with live turns without replacing unchanged rows", () => {
  const live = [turn("two", "Latest")];
  const saved = [turn("one"), turn("two", "Stale")];
  const merged = shareById(live, mergeTurnsById(saved, live), shareTurn);
  assert.deepEqual(merged.map((entry) => entry.id), ["one", "two"]);
  assert.equal(merged[1], live[0]);
  const reopened = shareById(merged, mergeTurnsById(structuredClone(saved), merged), shareTurn);
  assert.equal(reopened, merged);
});
