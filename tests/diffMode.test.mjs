import assert from "node:assert/strict";
import { test } from "node:test";
import { createJiti } from "jiti";

Object.defineProperty(globalThis, "navigator", { value: { platform: "MacIntel" }, configurable: true });
globalThis.window = Object.assign(new EventTarget(), {
  birdsong: { updateSettings: async (patch) => patch },
});
const jiti = createJiti(import.meta.url);
const { railModeStore } = await jiti.import("../src/renderer/features/explorer/railModeStore.ts");
const { modKey } = await jiti.import("../src/renderer/features/shortcuts/modKey.ts");
const { paletteCommands } = await jiti.import("../src/renderer/features/commandPalette/paletteCommands.ts");
const { diffViewMemory } = await jiti.import("../src/renderer/features/diff/diffViewMemory.ts");
const { gitPatchCache } = await jiti.import("../src/renderer/features/diff/gitPatchCache.ts");

test("Diff toggles back to the actual previous mode and requires an available session", () => {
  railModeStore.setHasSessions(true);
  for (const mode of ["sessions", "files"]) {
    railModeStore.set(mode);
    railModeStore.toggleDiff();
    assert.equal(railModeStore.getSnapshot(), "diff");
    railModeStore.toggleDiff();
    assert.equal(railModeStore.getSnapshot(), mode);
  }
  railModeStore.set("diff");
  railModeStore.setHasSessions(false);
  assert.equal(railModeStore.getSnapshot(), "sessions");
  railModeStore.toggleDiff();
  assert.equal(railModeStore.getSnapshot(), "sessions");
  railModeStore.restore("diff");
  railModeStore.setHasSessions(true);
  assert.equal(railModeStore.getSnapshot(), "diff");
});

test("the Diff chord is separate from Ctrl+D and rejects extra modifiers", () => {
  const event = { key: "D", metaKey: true, ctrlKey: false, shiftKey: true, altKey: false };
  assert.equal(modKey(event, "d", true), true);
  assert.equal(modKey({ ...event, shiftKey: false }, "d", true), false);
  assert.equal(modKey({ ...event, metaKey: false, ctrlKey: true }, "d", true), false);
  assert.equal(modKey({ ...event, altKey: true }, "d", true), false);
  assert.equal(modKey({ ...event, ctrlKey: true }, "d", true), false);
});

test("Diff offers review commands without editor commands or hidden-chat search", () => {
  const commands = paletteCommands({ mode: "diff", hasSession: true, hasSessions: true, supportsFork: true });
  const ids = commands.map((command) => command.id);
  for (const id of ["diff", "select-diff", "refresh-diff", "find-diff", "close-session", "fork-session", "focus-prompt"]) assert.ok(ids.includes(id));
  for (const id of ["save-file", "new-file", "find-history", "new-session", "find"]) assert.ok(!ids.includes(id));
  assert.equal(new Set(ids).size, ids.length);
  let toggles = 0;
  const listener = () => toggles++;
  window.addEventListener("birdsong:toggle-diff", listener);
  commands.find((command) => command.id === "diff").run();
  window.removeEventListener("birdsong:toggle-diff", listener);
  assert.equal(toggles, 1);
  const select = commands.find((command) => command.id === "select-diff");
  assert.equal(select.shortcut, "⇧⌘D");
  let selections = 0;
  window.addEventListener("birdsong:select-diff", () => selections++, { once: true });
  select.run();
  assert.equal(selections, 1);
});

test("review memory survives returning to a session without leaking to another session", () => {
  const one = diffViewMemory("one");
  one.scope = "staged";
  one.collapsed["staged:file"] = "abc";
  one.scroll.staged = 500;
  assert.equal(diffViewMemory("one"), one);
  assert.equal(diffViewMemory("one").scroll.staged, 500);
  assert.deepEqual(diffViewMemory("two").collapsed, {});
  assert.equal(diffViewMemory("two").scope, "all");
});

test("the patch cache evicts old entries while keeping recently visited patches", () => {
  const patch = { hunks: [] };
  for (let i = 0; i < 24; i++) gitPatchCache.set(`patch:${i}`, patch);
  assert.equal(gitPatchCache.get("patch:0"), patch);
  gitPatchCache.set("patch:24", patch);
  assert.equal(gitPatchCache.get("patch:0"), patch);
  assert.equal(gitPatchCache.get("patch:1"), undefined);
});
